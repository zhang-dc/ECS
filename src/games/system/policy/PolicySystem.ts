/**
 * 政策系统
 */
import { System } from '../../../engine/System';
import { Stage } from '../../../engine/Stage';
import { PolicyType, PolicyOption, PolicyTree } from '../../data/PolicyTypes';

export interface PolicySystemProps {
    world: Stage;
}

export class PolicySystem extends System {
    private activePolicies: Set<string> = new Set();

    constructor(props: PolicySystemProps) {
        super(props);
    }

    start(): void {
        console.log('[PolicySystem] 政策系统启动');
    }

    getAvailablePolicies(type: PolicyType): PolicyOption[] {
        const policies = PolicyTree[type] || [];
        return policies.filter(p => !this.activePolicies.has(p.id));
    }

    implementPolicy(option: PolicyOption, year: number): boolean {
        if (this.activePolicies.has(option.id)) {
            return false;
        }

        if (option.requires) {
            if (option.requires.year && year < option.requires.year) return false;
        }

        this.activePolicies.add(option.id);
        console.log(`[PolicySystem] 政策实施: ${option.title}`);
        return true;
    }

    getActivePolicies(): string[] {
        return Array.from(this.activePolicies);
    }

    isPolicyActive(policyId: string): boolean {
        return this.activePolicies.has(policyId);
    }
}
