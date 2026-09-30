import { Platform, StyleDependency, UNIWIND_PLATFORM_VARIABLES, UNIWIND_THEME_VARIABLES } from '@/common/consts'
import { isDefined } from '@/common/utils'
import type { ProcessorBuilder } from './processor'
import { serialize } from './serialize'
import type { StyleSheetTemplate } from './types'
import { toCamelCase } from './utils'

const extractVarsFromString = (value: string) => {
    const varsIndexes = [...value.matchAll(/vars\[/g)].map(m => m.index)

    return varsIndexes.map(index => {
        const afterIndex = value.slice(index + 5)
        const closingIndex = afterIndex.indexOf(']')
        const varName = afterIndex.slice(0, closingIndex)

        return varName.replace(/[`"\\]/g, '')
    })
}

const makeSafeForSerialization = (value: any) => {
    if (value === null) {
        return null
    }

    if (typeof value === 'string') {
        return `"${value}"`
    }

    return value
}

const hasThemedVarDependency = (varName: string, Processor: ProcessorBuilder, visited = new Set<string>()): boolean => {
    if (visited.has(varName)) {
        return false
    }

    visited.add(varName)

    const isScopedVar = Object.values(Processor.scopedVars).some(scopedVars => varName in scopedVars)

    if (isScopedVar) {
        return true
    }

    const globalVarValue = Processor.vars[varName]

    if (typeof globalVarValue !== 'string') {
        return false
    }

    if (globalVarValue.includes('vars.__uniwindTheme')) {
        return true
    }

    return extractVarsFromString(globalVarValue).some(usedVarName => {
        return hasThemedVarDependency(usedVarName, Processor, visited)
    })
}

// Include indirect aliases and scoped values when deriving runtime subscriptions.
// Otherwise a root variable getter changes on resize but its cached styles do not.
const getVariableExpressions = (names: Array<string>, scopes: Array<ProcessorBuilder['vars']>, visited = new Set<string>()): string => {
    return names.map(name => {
        if (visited.has(name)) {
            return ''
        }
        visited.add(name)
        const values = scopes.map(scope => scope[name])
        return values.filter(value => typeof value === 'string').map(value => {
            return value + getVariableExpressions(extractVarsFromString(value), scopes, visited)
        }).join(' ')
    }).join(' ')
}

export const addMetaToStylesTemplate = (Processor: ProcessorBuilder, currentPlatform: Platform) => {
    const isTV = currentPlatform === Platform.AndroidTV || currentPlatform === Platform.AppleTV
    const commonPlatform = isTV ? Platform.TV : Platform.Native
    const variableScopes = [
        Processor.vars,
        ...Object.entries(Processor.scopedVars)
            .filter(([scope]) =>
                scope.startsWith(UNIWIND_THEME_VARIABLES)
                || scope === `${UNIWIND_PLATFORM_VARIABLES}${commonPlatform}`
                || scope === `${UNIWIND_PLATFORM_VARIABLES}${currentPlatform}`
            )
            .map(([, values]) => values),
    ]
    const stylesheetsEntries = Object.entries(Processor.stylesheets as StyleSheetTemplate)
        .map(([className, stylesPerMediaQuery]) => {
            const styles = stylesPerMediaQuery.map((style, index) => {
                const {
                    platform,
                    rtl,
                    theme,
                    orientation,
                    minWidth,
                    maxWidth,
                    colorScheme,
                    important: _,
                    importantProperties,
                    active,
                    focus,
                    disabled,
                    dataAttributes,
                    ...rest
                } = style

                const entries = Object.entries(rest)
                    .flatMap(([property, value]) => Processor.RN.cssToRN(property, value))
                    .map(([property, value]) => [`"${property}"`, `function(vars) { return ${serialize(value)} }`])

                if (platform) {
                    if (platform !== commonPlatform && platform !== currentPlatform) {
                        return null
                    }
                }

                if (entries.length === 0) {
                    return null
                }

                const dependencies: Array<StyleDependency> = []
                const stringifiedEntries = JSON.stringify(entries)
                const usedVars = extractVarsFromString(stringifiedEntries)
                const runtimeExpressions = stringifiedEntries + getVariableExpressions(usedVars, variableScopes)
                const isUsingThemedVar = usedVars.some(usedVarName => hasThemedVarDependency(usedVarName, Processor))

                if (usedVars.length > 0) {
                    dependencies.push(StyleDependency.Variables)
                }

                if (
                    theme !== null || isUsingThemedVar || runtimeExpressions.includes('rt.lightDark')
                    || runtimeExpressions.includes('rt.currentThemeName')
                ) {
                    dependencies.push(StyleDependency.Theme)
                }

                if (orientation !== null || runtimeExpressions.includes('rt.orientation')) {
                    dependencies.push(StyleDependency.Orientation)
                }

                if (rtl !== null) {
                    dependencies.push(StyleDependency.Rtl)
                }

                if (
                    Number(minWidth) !== 0
                    || Number(maxWidth) !== Number.MAX_VALUE
                    || runtimeExpressions.includes('rt.screen')
                ) {
                    dependencies.push(StyleDependency.Dimensions)
                }

                if (runtimeExpressions.includes('rt.insets')) {
                    dependencies.push(StyleDependency.Insets)
                }

                if (runtimeExpressions.includes('rt.fontScale')) {
                    dependencies.push(StyleDependency.FontScale)
                }

                return {
                    entries,
                    minWidth,
                    maxWidth,
                    theme: makeSafeForSerialization(theme),
                    orientation: makeSafeForSerialization(orientation),
                    rtl,
                    colorScheme: makeSafeForSerialization(colorScheme),
                    native: platform !== null,
                    dependencies: dependencies.length > 0 ? dependencies : null,
                    index,
                    className: makeSafeForSerialization(className),
                    active,
                    focus,
                    disabled,
                    importantProperties: importantProperties
                        ?.map(property => property.startsWith('--') ? property : toCamelCase(property))
                        .map(makeSafeForSerialization) ?? [],
                    dataAttributes,
                    complexity: [
                        minWidth !== 0,
                        theme !== null,
                        orientation !== null,
                        rtl !== null,
                        platform !== null,
                        active !== null,
                        focus !== null,
                        disabled !== null,
                        dataAttributes !== null,
                    ].filter(Boolean).length,
                }
            })

            const filteredStyles = styles.filter(isDefined)

            if (filteredStyles.length === 0) {
                return null
            }

            return [
                className,
                filteredStyles,
            ] as const
        })
        .filter(isDefined)
    const stylesheets = Object.fromEntries(stylesheetsEntries) as Record<string, any>

    return stylesheets
}
