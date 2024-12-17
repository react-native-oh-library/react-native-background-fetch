/*
 * Copyright (c) 2024 Huawei Device Co., Ltd. All rights reserved
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */

import { TurboModule, TurboModuleContext } from '@rnoh/react-native-openharmony/ts';
import { TM } from '@rnoh/react-native-openharmony/generated/ts';
import { BusinessError, commonEventManager } from '@kit.BasicServicesKit';
import { workScheduler } from '@kit.BackgroundTasksKit';
import { common } from '@kit.AbilityKit';
import { BackgroundFetchConfig, BackgroundFetchStatus, Callback, NetworkType, TaskConfig } from './Type';
import Logger from './Logger';

const DEFAULT_FETCH_INTERVAL = 20
const STATUS_RESTRICTED = 0;
const STATUS_DENIED = 1;
const STATUS_AVAILABLE = 2;

const MAX_TIME = 60000;

const EVENT_FETCH = "fetch";
const TAG = "TSBackgroundFetch";

function hashCode(str: string): number {
  let hash = 0;
  let i;
  let char;
  if (str.length === 0) {
    return 1171293699;
  }
  for (i = 0; i < str.length; i++) {
    char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export class RNBackgroundFetch extends TurboModule implements TM.RNBackgroundFetch.Spec {
  private static FETCH_TASK_ID: string = 'react-native-background-fetch';
  private myTaskId: Map<string, number> = new Map();
  private mConfig: Map<string, Builder> = new Map();
  private taskS: string[] = []
  private mFetchCallback: Callback;

  private context: common.UIAbilityContext;
  private subscriber: commonEventManager.CommonEventSubscriber;
  private subscribeInfo: commonEventManager.CommonEventSubscribeInfo = {
    events: ["fetch"]
  };
  private config = new Builder()
  private timer = null
  private isSubscribe = false

  constructor(ctx: TurboModuleContext) {
    super(ctx);
    this.context = ctx.uiAbilityContext
    this.setCallback()
    // 创建订阅者回调
    this.setCommonEventManager()
  }

  public async configure(config: BackgroundFetchConfig, success: (status: BackgroundFetchStatus) => void,
    failure: (status: BackgroundFetchStatus) => void) {

    const mConfig =
      this.buildConfig(config).setTaskId(RNBackgroundFetch.FETCH_TASK_ID).setIsFetchTask(true).setPeriodic(true)

    if (this.myTaskId.get(mConfig.taskId) && (Date.now() - this.myTaskId.get(mConfig.taskId) < 1000)) {
      return
    }

    this.config = mConfig
    this.myTaskId.set(mConfig.taskId, Date.now());
    const currentConfig = this.mConfig.get(mConfig.taskId)
    if (currentConfig) {
      try {
        const workInfo = await workScheduler.getWorkStatus(currentConfig.workId)
        this.cancel(workInfo)
        this.schedule(mConfig)
        this.mConfig.set(mConfig.taskId, mConfig)
      } catch (error) {
        Logger.error(`configure failed. code is ${error.code} message is ${error.message}`);
      }
      return;
    }

    // 启动fetch任务
    this.start(success, failure);
  }

  public async scheduleTask(config: TaskConfig, success: (status: boolean) => void,
    failure: (status: boolean) => void) {
    const mConfig = this.buildConfig(config)

    if (this.myTaskId.get(mConfig.taskId) && (Date.now() - this.myTaskId.get(mConfig.taskId) < 1000)) {
      return
    }

    this.myTaskId.set(mConfig.taskId, Date.now());
    const currentConfig = this.mConfig.get(mConfig.taskId)

    if (currentConfig) {
      // 这个BackgroundFetchConfig已经存在？我们应该在这里停止任何现有的Job/Alarm吗？
      try {
        const workInfo = await workScheduler.getWorkStatus(currentConfig.workId)
        this.cancel(workInfo)
      } catch (error) {
        Logger.error(`workschedulerLog getWorkStatus failed. code is ${error.code} message is ${error.message}`);
      }
    }

    this.mConfig.set(mConfig.taskId, mConfig);
    this.registerTask(mConfig)
    success(true)
  }

  public start(success: (status: BackgroundFetchStatus) => void, failure: (status: BackgroundFetchStatus) => void) {
    if (this.mConfig.has(RNBackgroundFetch.FETCH_TASK_ID)) {
      Logger.info(TAG, "[" + TAG + " start] Task " + RNBackgroundFetch.FETCH_TASK_ID + " already registered");
      return
    }

    this.registerTask(this.config)
    this.mConfig.set(this.config.taskId, this.config)
    this.status(success)
  }

  public async stop(taskId: string, success: (status: boolean) => void, failure: (status: boolean) => void) {
    try {
      if (!taskId) {
        taskId = RNBackgroundFetch.FETCH_TASK_ID
      }
      const res = await workScheduler.obtainAllWorks()

      if (!res.length) {
        this.mConfig = new Map()
        this.myTaskId = new Map()
        this.taskS = []
      }

      if (res.length && taskId) {
        const current = res.find((item) => item.parameters.taskId === taskId)
        if (current) {
          this.cancel(current)
          const index = this.taskS.indexOf(taskId)
          if (index > -1) {
            this.taskS.splice(index, 1)
          }
        }
      }

      success(true)
    } catch (error) {
      Logger.error(`stop failed. code is ${error.code} message is ${error.message}`);
    }
  }

  public status(success: (value: BackgroundFetchStatus) => void) {
    success(STATUS_AVAILABLE)
  }

  public async finish(taskId: string) {
    if (!taskId) {
      taskId = RNBackgroundFetch.FETCH_TASK_ID
    }

    if (!this.mConfig.has(taskId)) return

    clearTimeout(this.timer)
    this.timer = null

    const index = this.taskS.indexOf(taskId)
    let current: Builder
    if (index > -1) {
      current = this.mConfig.get(taskId)
    }
    if (current && !current.isFetchTask) {
      this.taskS.splice(index, 1)
    }
  }

  // 添加监听器
  public addListener() {
    // Keep:  Required for RN built-in NativeEventEmitter calls.
  }

  // 移除监听器
  public removeListeners() {
    // Keep:  Required for RN built-in NativeEventEmitter calls.
  }

  // 注册任务+调度
  private async registerTask(config: Builder) {
    try {
      const res = await workScheduler.obtainAllWorks()
      if (res.length) {
        if (res.length === 10) {
          const index = res.findIndex(item => item.parameters.taskId !== RNBackgroundFetch.FETCH_TASK_ID)
          this.cancel(res[index])
          res.splice(index, 1)
        }
        if (res.length < 10 && res.length > 0) {
          const current = res.find((item) => item.parameters.taskId === config.taskId)
          if (current) {
            this.cancel(current)
          }
        }
      }
      this.schedule(config)
    } catch (error) {
      Logger.error(`registerTask failed. code is ${error.code} message is ${error.message}`);
    }

  }

  // 调度
  private schedule(config: Builder) {
    const bundleName = this.context.abilityInfo.bundleName
    const workInfo = this.setWorkInfo(bundleName, config)
    Logger.info(`schedule workInfo ${JSON.stringify(workInfo)}`);
    try {
      if (!this.taskS.includes(config.taskId)) {
        this.taskS.push(config.taskId)
      }
      workScheduler.startWork(workInfo);
      Logger.info(`schedule startWork success`, JSON.stringify(workInfo));
      // 订阅公共事件
      this.subscribe()
    } catch (error) {
      Logger.error(`schedule failed. code is ${(error as BusinessError).code} message is ${(error as BusinessError).message}`);
    }
  }

  // 取消
  private cancel(workInfo: workScheduler.WorkInfo) {
    workScheduler.stopWork(workInfo, true);
    this.mConfig.delete(workInfo.parameters.taskId as string)
  }

  private setCallback() {
    this.mFetchCallback = {
      onFetch: (taskId: string) => {
        const event = {
          taskId,
          timeout: false
        }
        this.ctx.rnInstance.emitDeviceEvent(EVENT_FETCH, event)
      },
      onTimeout: (taskId: string) => {
        const event = {
          taskId,
          timeout: true
        }
        this.ctx.rnInstance.emitDeviceEvent(EVENT_FETCH, event)
      }
    }
  }

  // 订阅公共事件回调
  private async subscribe() {
    if (this.subscriber !== null) {
      commonEventManager.subscribe(this.subscriber,
        (err: BusinessError, commonEventData: commonEventManager.CommonEventData) => {
          if (err) {
            Logger.error(`commonEventManager subscribe failed. code is ${err.code} message is ${err.message}`);
          } else {
            Logger.info(`commonEventManager subscribe success. data is ${commonEventData.data}`);
            const parameters = JSON.parse(JSON.parse(commonEventData.data).parameters)
            this.mFetchCallback.onFetch(parameters.taskId)
            this.timer = setTimeout(() => {
              this.mFetchCallback.onTimeout(parameters.taskId)
            }, MAX_TIME)
          }
        })
    }
  }

  // 创建订阅者回调
  private setCommonEventManager() {
    try {
      this.subscriber = commonEventManager.createSubscriberSync(this.subscribeInfo);
    } catch (error) {
      let err: BusinessError = error as BusinessError;
      Logger.error(`createSubscriberSync failed, code is ${err.code}, message is ${err.message}`);
    }
  }

  private buildConfig(options: BackgroundFetchConfig | TaskConfig) {
    const config = new Builder()

    if ('taskId' in options) {
      config.setTaskId(options.taskId)
      config.setWorkId(options.taskId)
    }
    if ('minimumFetchInterval' in options) {
      config.setMinimumFetchInterval(options.minimumFetchInterval)
    }
    if ('delay' in options) {
      config.setDelay(options.delay)
    }
    if ('periodic' in options) {
      config.setPeriodic(options.periodic)
    }
    if ('requiredNetworkType' in options) {
      config.setRequiredNetworkType(options.requiredNetworkType)
    }
    if ('requiresBatteryNotLow' in options) {
      config.setRequiresBatteryNotLow(options.requiresBatteryNotLow)
    }
    if ('requiresStorageNotLow' in options) {
      config.setRequiresStorageNotLow(options.requiresStorageNotLow)
    }
    if ('requiresCharging' in options) {
      config.setRequiresCharging(options.requiresCharging)
    }
    if ('requiresDeviceIdle' in options) {
      config.setRequiresDeviceIdle(options.requiresDeviceIdle)
    }

    return config
  }

  private setWorkInfo(bundleName: string, config: Builder) {
    let repeatCycleTime = config.isFetchTask ? config.minimumFetchInterval * 60 * 1000 : config.delay
    if (repeatCycleTime < 1200000) {
      repeatCycleTime = 1200000
    }

    let workInfo: workScheduler.WorkInfo = {
      workId: hashCode(config.taskId),
      bundleName: bundleName,
      abilityName: "MyWorkSchedulerExtensionAbility",
      repeatCycleTime,
      isRepeat: config.periodic,
      parameters: {
        taskId: config.taskId
      }
    }

    if (!workInfo.isRepeat) {
      workInfo.repeatCount = 1
    }
    if ('requiresCharging' in config && (typeof config.requiresCharging === 'boolean')) {
      workInfo.isCharging = config.requiresCharging
    }
    if ('periodic' in config && (typeof config.periodic === 'boolean')) {
      workInfo.isRepeat = config.periodic
    }
    if (config.isFetchTask) {
      workInfo.isRepeat = config.isFetchTask
    }
    if ('requiresDeviceIdle' in config && (typeof config.requiresDeviceIdle === 'boolean')) {
      workInfo.isDeepIdle = config.requiresDeviceIdle
    }
    if ('requiredNetworkType' in config && config.requiredNetworkType >= 0) {
      workInfo.networkType = config.requiredNetworkType
    }
    if ('requiresBatteryNotLow' in config && config.requiresBatteryNotLow >= 0) {
      workInfo.batteryStatus = config.requiresBatteryNotLow
    }
    if ('requiresStorageNotLow' in config && config.requiresStorageNotLow >= 0) {
      workInfo.storageRequest = config.requiresStorageNotLow
    }

    return workInfo
  }
}

class Builder {
  public taskId: string = '';
  public minimumFetchInterval: number = DEFAULT_FETCH_INTERVAL;
  public delay: number = 0;
  public periodic: boolean = false; // 重复执行
  public isFetchTask: boolean = false;
  public workId: number = 1171293699
  public requiredNetworkType: workScheduler.NetworkType;
  public requiresBatteryNotLow: workScheduler.BatteryStatus;
  public requiresStorageNotLow: workScheduler.StorageRequest;
  public requiresCharging: boolean;
  public requiresDeviceIdle: boolean;

  // 设置任务ID
  public setTaskId(taskId: string) {
    this.taskId = taskId;
    return this;
  }

  public setMinimumFetchInterval(minimumFetchInterval: number) {
    this.minimumFetchInterval = minimumFetchInterval;
    return this;
  }

  public setDelay(delay: number) {
    this.delay = delay;
    return this;
  }

  public setPeriodic(periodic: boolean) {
    this.periodic = periodic;
    return this;
  }

  public setIsFetchTask(value: boolean) {
    this.isFetchTask = value;
    return this;
  }

  public setWorkId(value: string) {
    this.workId = hashCode(value);
    return this;
  }

  public setRequiredNetworkType(value: NetworkType) {
    switch (value) {
      case NetworkType.NETWORK_TYPE_ANY:
        this.requiredNetworkType = workScheduler.NetworkType.NETWORK_TYPE_ANY;
        break;
      case NetworkType.NETWORK_TYPE_MOBILE:
        this.requiredNetworkType = workScheduler.NetworkType.NETWORK_TYPE_MOBILE;
        break;
      case NetworkType.NETWORK_TYPE_WIFI:
        this.requiredNetworkType = workScheduler.NetworkType.NETWORK_TYPE_WIFI;
        break;
      default:
        this.requiredNetworkType = workScheduler.NetworkType.NETWORK_TYPE_ANY;
    }
    return this;
  }

  public setRequiresBatteryNotLow(value: boolean) {
    switch (value) {
      case true:
        this.requiresBatteryNotLow = workScheduler.BatteryStatus.BATTERY_STATUS_LOW;
        break;
      case false:
        this.requiresBatteryNotLow = workScheduler.BatteryStatus.BATTERY_STATUS_LOW_OR_OKAY;
        break;
      default:
        this.requiresBatteryNotLow = workScheduler.BatteryStatus.BATTERY_STATUS_LOW;
    }

    return this;
  }

  public setRequiresStorageNotLow(value: boolean) {
    switch (value) {
      case true:
        this.requiresStorageNotLow = workScheduler.StorageRequest.STORAGE_LEVEL_LOW;
        break;
      case false:
        this.requiresStorageNotLow = workScheduler.StorageRequest.STORAGE_LEVEL_LOW_OR_OKAY
        break;
      default:
        this.requiresStorageNotLow = workScheduler.StorageRequest.STORAGE_LEVEL_LOW;
    }

    return this;
  }

  public setRequiresCharging(value: boolean) {
    this.requiresCharging = value;
    return this;
  }

  public setRequiresDeviceIdle(value: boolean) {
    this.requiresDeviceIdle = value;
    return this;
  }
}