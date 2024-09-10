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