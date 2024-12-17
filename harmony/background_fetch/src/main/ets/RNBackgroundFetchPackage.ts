/*
 * Copyright (c) 2024 Huawei Device Co., Ltd. All rights reserved
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */

import type { TurboModule, TurboModuleContext, } from '@rnoh/react-native-openharmony/ts';
import { RNPackage, TurboModulesFactory, } from '@rnoh/react-native-openharmony/ts';
import { TM } from '@rnoh/react-native-openharmony/generated/ts';
import { RNBackgroundFetch } from './RNBackgroundFetchModule';

class RNBackgroundFetchModulesFactory extends TurboModulesFactory {
  createTurboModule(name: string): TurboModule | null {
    if (name === TM.RNBackgroundFetch.NAME) {
      return new RNBackgroundFetch(this.ctx);
    }
    return null;
  }

  hasTurboModule(name: string): boolean {
    return name === TM.RNBackgroundFetch.NAME;
  }
}

export class RNBackgroundFetchPackage extends RNPackage {
  createTurboModulesFactory(ctx: TurboModuleContext): TurboModulesFactory {
    return new RNBackgroundFetchModulesFactory(ctx);
  }
}