import { workScheduler, WorkSchedulerExtensionAbility } from '@kit.BackgroundTasksKit';
import { BusinessError, commonEventManager } from '@kit.BasicServicesKit';
import Logger from '../Logger';

export default class RNBackgroundFetchExtensionAbility extends WorkSchedulerExtensionAbility {
  private static EVENT_FETCH: string = 'fetch'

  // 延迟任务开始回调
  onWorkStart(workInfo: workScheduler.WorkInfo) {
    Logger.info(`onWorkStart, workInfo = ${JSON.stringify(workInfo)}`);
    // 公共事件相关信息
    let options: commonEventManager.CommonEventPublishData = {
      code: 1,
      data: JSON.stringify(workInfo),
    }

    // 发布公共事件，其中的event字段需要替换为实际的事件名称
    commonEventManager.publish(RNBackgroundFetchExtensionAbility.EVENT_FETCH, options, (err: BusinessError) => {
      if (err) {
        Logger.error(`commonEvent publish failed, err = ${JSON.stringify(err)}`);
      } else {
        Logger.info(`commonEvent publish success`);
      }
    })
  }

  // 延迟任务结束回调
  onWorkStop(workInfo: workScheduler.WorkInfo) {
    Logger.info(`onWorkStop, workInfo is ${JSON.stringify(workInfo)}`);
  }
}