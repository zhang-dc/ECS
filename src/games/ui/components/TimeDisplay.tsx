/**
 * 时间显示组件
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Stage } from '../../../engine/Stage';
import { TimeComponent } from '../../components/TimeComponent';
import './TimeDisplay.css';

interface TimeDisplayProps {
    world: Stage;
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({ world }) => {
    const [dateStr, setDateStr] = useState('加载中...');
    const [seasonStr, setSeasonStr] = useState('');

    const updateTime = useCallback(() => {
        const components = world.findComponents(TimeComponent);
        if (components.length > 0) {
            const time = components[0];
            setDateStr(time.getDateString());
            setSeasonStr(time.getSeasonName());
        }
    }, [world]);

    useEffect(() => {
        updateTime();
        const unsub = world.on('game:dayChange', updateTime);
        return () => unsub();
    }, [world, updateTime]);

    return (
        <div className="time-display">
            <span className="time-date">{dateStr}</span>
            <span className="time-season">{seasonStr}</span>
        </div>
    );
};
