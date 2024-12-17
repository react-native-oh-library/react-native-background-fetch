/*
 * Copyright (c) 2024 Huawei Device Co., Ltd. All rights reserved
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */

declare module "react-native-background-fetch" {

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
		* 任务的名称。这将与[[BackgroundFetch.finish]]一起使用，以指示任务完成。
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
	export type BackgroundFetchStatus = 0 | 1 | 2;
	
	/**
	* | NetworkType                           | 描述                                |
	* |---------------------------------------|-------------------------------------|
	* | NETWORK_TYPE_ANY                      | 表示这个触发条件是任何类型的网络连接。 |
	* | NETWORK_TYPE_MOBILE  	                | 表示这个触发条件是Mobile网络连接。    |
	* | NETWORK_TYPE_WIFI                     | 表示这个触发条件是Wifi类型的网络连接。 |
	*/
	// type NetworkType = 0 | 1 | 2 | 3 | 4 | 5;
	
	export enum NetworkType {
		NETWORK_TYPE_ANY = 0,
		NETWORK_TYPE_MOBILE = 1,
		NETWORK_TYPE_WIFI = 2,
	}
	
	/**
	* BackgroundFetch is a module to receive periodic callbacks (min every 15 min) while your app is running in the background or terminated.
	*/
	export default class BackgroundFetch {
		/**
		* Initial configuration of BackgroundFetch, including config-options and Fetch-callback.  The [[start]] method will automatically be executed.
		*/
		static configure(config:BackgroundFetchConfig, onEvent:(taskId:string) => void, onTimeout?:(taskId:string) => void):Promise<BackgroundFetchStatus>;
		/**
		* Add an extra fetch event listener in addition to the one initially provided to [[configure]].
		* @event
		*/
		static scheduleTask(config:TaskConfig):Promise<boolean>;

		/**
		* Start subscribing to fetch events.
		*/
		static start():Promise<BackgroundFetchStatus>;
		/**
		* Stop subscribing to fetch events.
		*/
		static stop(taskId?:string):Promise<boolean>;
		/**
		* You must execute [[finish]] within your fetch-callback to signal completion of your task.
		*/
		static finish(taskId?:string):void;
		/**
		* Query the BackgroundFetch API status
		*
		* | BackgroundFetchStatus              | Description                                     |
		* |------------------------------------|-------------------------------------------------|
		* | BackgroundFetch.STATUS_RESTRICTED  | Background fetch updates are unavailable and the user cannot enable them again. For example, this status can occur when parental controls are in effect for the current user. |
		* | BackgroundFetch.STATUS_DENIED      | The user explicitly disabled background behavior for this app or for the whole system. |
		* | BackgroundFetch.STATUS_AVAILABLE   | Background fetch is available and enabled.      |
		*/
		static status(callback?:(status:BackgroundFetchStatus) => void):Promise<BackgroundFetchStatus>;
	}
}
