interface AbstractConfig {
  /**
   * 设置详细描述您的作业所需的网络类型。
   *
   * 对应harmonyOS的 workInfo.networkType
   */
  requiredNetworkType?: NetworkType;

  /**
   * 指定要运行此作业，设备的电池电量情况。
   *
   * 对应harmonyOS的 workInfo.batteryStatus
   */
  requiresBatteryNotLow?: boolean;

  /**
   * 指定要运行此作业，设备的可用存储必须不高。
   *
   * 对应harmonyOS的 workInfo.storageRequest
   */
  requiresStorageNotLow?: boolean;

  /**
   * 指定要运行此作业，设备必须充电。默认为false。
   *
   * 对应harmonyOS的 workInfo.isCharging
   */
  requiresCharging?: boolean;

  /**
   * 当设置为true时，确保此作业将在设备处于活跃使用状态时不运行。
   *
   * 是否要求设备进入空闲状态。- true表示需要，false表示不需要。
   *
   * 对应harmonyOS的 workInfo.isDeepIdle
   *
   */
  requiresDeviceIdle?: boolean;
}

export interface TaskConfig extends AbstractConfig {
  /**
   * 任务的名称。
   */
  taskId: string;
  /**
   * 执行此任务的最小间隔（毫秒）。
   */
  delay: number;
  /**
   * 此任务是否将继续执行或只是一个“一次性”任务。
   */
  periodic?: boolean;
}

export interface BackgroundFetchConfig extends AbstractConfig {
  /**
   * 执行后台获取事件的最小间隔（分钟）。默认为20分钟。最小值为20分钟。
   */
  minimumFetchInterval?: number;
}

/**
 * | BackgroundFetchStatus              | 描述                                     |
 * |------------------------------------|-------------------------------------------------|
 * | BackgroundFetch.STATUS_RESTRICTED  | 后台获取更新不可用，用户无法再次启用它们。例如，此状态可以在当前用户处于家长控制下时发生。 |
 * | BackgroundFetch.STATUS_DENIED      | 用户明确禁用了此应用程序或整个系统的后台行为。 |
 * | BackgroundFetch.STATUS_AVAILABLE   | 后台获取可用且已启用。      |
 */
export  type BackgroundFetchStatus = 0 | 1 | 2;

/**
 * | NetworkType                           | 描述                                |
 * |---------------------------------------|-------------------------------------|
 * | NETWORK_TYPE_ANY                      | 表示这个触发条件是任何类型的网络连接。 |
 * | NETWORK_TYPE_MOBILE  	                | 表示这个触发条件是Mobile网络连接。    |
 * | NETWORK_TYPE_WIFI                     | 表示这个触发条件是Wifi类型的网络连接。 |
 */

export enum NetworkType {
  NETWORK_TYPE_ANY = 0,
  NETWORK_TYPE_MOBILE = 1,
  NETWORK_TYPE_WIFI = 2,
}

export type Event = {
  taskId: number,
  timeout: boolean
}

export interface Callback {
  onFetch: (taskId: string) => void;
  onTimeout: (taskId: string) => void;
}