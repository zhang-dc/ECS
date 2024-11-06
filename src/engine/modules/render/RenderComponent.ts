import { Application, Container, DisplayObject, Ticker, TickerCallback } from 'pixi.js';
import { Component, ComponentProps } from '../../Component';

export interface RenderComponentProps extends ComponentProps {
    renderStage: Application;
}

export class RenderComponent extends Component {
    renderObject?: DisplayObject;
    renderStage: Application;
    tickers: TickerCallback<Ticker>[] = [];
    /**
     * 标记 render 是否有更新
     */
    dirty = false;

    constructor(props: RenderComponentProps) {
        super(props);
        const { renderStage } = props;
        this.renderStage = renderStage;
    }

    /**
     * 添加动画
     * @param ticker 
     */
    addTicker(ticker: TickerCallback<Ticker>) {
        this.tickers.push(ticker);
        this.renderStage.ticker.add(ticker);
    }

    /**
     * 移除动画
     * @param ticker 
     */
    removeTicker(ticker: TickerCallback<Ticker>) {
        const index = this.tickers.indexOf(ticker);
        if (index < 0) {
            return;
        }
        this.tickers.splice(index, 1);
        this.renderStage.ticker.remove(ticker);
    }

    /**
     * 添加执行一次的动画
     * @param ticker 
     */
    addTickerOnce(ticker: TickerCallback<Ticker>) {
        this.renderStage.ticker.addOnce(ticker);
    }

    destroy() {
        this.renderObject?.destroy();
        super.destroy();
    }
}
