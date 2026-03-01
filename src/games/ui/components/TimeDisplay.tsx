/**
 * 时间显示组件
 */
import React, { useEffect, useState } from 'react';
import { Stage } from '../../../engine/Stage';
import { TimeComponent } from '../../components/TimeComponent';
import './TimeDisplay.css';

interface TimeDisplayProps {
    world: Stage;
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({ world }) => {
    const [time, setTime] = useState<TimeComponent | null>(null);

    useEffect(() => {
        const components = world.findComponents(TimeComponent);
        if (components.length > 0) {
            setTime(components[0]);
        }
    }, [world]);

    if (!time) {
        return <div className="time-display loading">时间加载中...</div>;
    }

    return (
        <div className="time-display">
            <span className="time-date">{time.getDateString()}</span>
            <span className="time-season">{time.getSeasonName()}</span>
        </div>
    );
};
