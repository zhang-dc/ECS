import { RenderConfig } from '../../../engine/modules/render/RenderConfig';
import { System } from '../../../engine/System';
import { instanceMainThemeBackground } from './entity/Background';

export class MainThemeSystem extends System {
    renderConfig?: RenderConfig;

    start() {
        this.renderConfig = this.world.findComponent(RenderConfig);
        this.initMainTheme();
    }

    initMainTheme() {
        const background = instanceMainThemeBackground({ world: this.world, renderStage: this.renderConfig!.renderStage })
        this.world.addEntity(background);
    }
}
