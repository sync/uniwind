import type { CustomAtRules, Visitor } from 'lightningcss'
import type { UniwindBundlerConfig } from '../config'
import { FunctionVisitor } from './function-visitor'
import { RuleVisitor } from './rule-visitor'

export class UniwindCSSVisitor implements Visitor<CustomAtRules> {
    Function: Visitor<CustomAtRules>['Function']
    Rule: Visitor<CustomAtRules>['Rule']
    StyleSheet: Visitor<CustomAtRules>['StyleSheet']

    constructor(bundlerConfig: UniwindBundlerConfig) {
        const ruleVisitor = new RuleVisitor(bundlerConfig)

        this.Function = new FunctionVisitor()
        this.Rule = ruleVisitor

        this.StyleSheet = () => {
            ruleVisitor.cleanup()
        }
    }
}
