/**
 * 资源面板组件
 */
import React, { useEffect, useState } from 'react';
import { Stage } from '../../../engine/Stage';
import { ResourceComponent } from '../../components/ResourceComponent';
import { ResourceType, ResourceLabels } from '../../data/ResourceTypes';
import './ResourcePanel.css';

interface ResourcePanelProps {
    world: Stage;
}

export const ResourcePanel: React.FC<ResourcePanelProps> = ({ world }) => {
    const [resources, setResources] = useState<Partial<Record<ResourceType, number>>>({});

    useEffect(() => {
        const updateResources = () => {
            const components = world.findComponents(ResourceComponent);
            if (components.length > 0) {
                setResources(components[0].getAllResources());
            }
        };

        updateResources();

        const unsubscribe = world.on('resource:change', updateResources);
        return () => unsubscribe();
    }, [world]);

    const displayResources = [
        ResourceType.Money,
        ResourceType.Food,
        ResourceType.Labor,
        ResourceType.Tech,
        ResourceType.Trust,
    ];

    return (
        <div className="resource-panel">
            <h3>资源</h3>
            {displayResources.map(type => (
                <div key={type} className="resource-item">
                    <span className="resource-label">{ResourceLabels[type]}</span>
                    <span className="resource-value">{Math.round(resources[type] || 0)}</span>
                </div>
            ))}
        </div>
    );
};
