import { act, renderHook } from '@testing-library/react-native'
import { createElement, type PropsWithChildren } from 'react'
import { Platform as NativePlatform } from 'react-native'
import { UniwindBundlerConfig } from '../../../src/bundler/config'
import { compileNativeCSS } from '../../../src/bundler/css-compiler/compileNativeCSS'
import { Orientation, Platform, StyleDependency } from '../../../src/common/consts'
import { ScopedTheme } from '../../../src/components/ScopedTheme/ScopedTheme.native'
import { ScopedVariables } from '../../../src/components/ScopedVariables/ScopedVariables.native'
import { UniwindListener } from '../../../src/core/listener'
import { UniwindStore } from '../../../src/core/native/store'
import type { GenerateStyleSheetsCallback } from '../../../src/core/types'
import { useCSSVariable } from '../../../src/hooks/useCSSVariable'

const compile = (css: string, platform = Platform.iOS) => {
    const config = UniwindBundlerConfig.fromMetroConfig({ cssEntryFile: './tests/test.css' }, platform)
    const code = compileNativeCSS(config, css)
    // oxlint-disable-next-line no-eval
    return eval(`(rt => ${code})`) as GenerateStyleSheetsCallback
}

describe('color-scheme root variables', () => {
    const originalTheme = UniwindStore.runtime.currentThemeName
    const originalScreen = UniwindStore.runtime.screen
    const originalOrientation = UniwindStore.runtime.orientation
    const originalPlatform = NativePlatform.OS

    afterEach(() => {
        UniwindStore.runtime.currentThemeName = originalTheme
        UniwindStore.runtime.screen = originalScreen
        UniwindStore.runtime.orientation = originalOrientation
        NativePlatform.OS = originalPlatform
    })

    test.each([Platform.iOS, Platform.Android])('uses scoped themes for %s variables and aliases', platform => {
        const config = UniwindBundlerConfig.fromMetroConfig({ cssEntryFile: './tests/test.css' }, platform)
        const code = compileNativeCSS(
            config,
            `
            :root { --size: 20px; --alias: var(--size); }
            @media (prefers-color-scheme: light) {
                :root { --size: 24px; }
                .literal { font-size: 24px; }
            }
            @media (prefers-color-scheme: dark) {
                :root { --size: 32px; }
                .literal { font-size: 32px; }
                @media (width >= 768px) { :root { --size: 40px; } }
            }
            .variable { font-size: var(--alias); }
        `,
        )
        // oxlint-disable-next-line no-eval
        const compile = eval(`(rt => ${code})`) as GenerateStyleSheetsCallback
        UniwindStore.reinit(compile, ['light', 'dark'])

        for (const globalTheme of ['light', 'dark'] as const) {
            UniwindStore.runtime.currentThemeName = globalTheme
            UniwindStore.runtime.screen = { width: 390, height: 844 }
            for (const theme of ['light', 'dark'] as const) {
                const expected = theme === 'dark' ? 32 : 24
                const context = { scopedTheme: theme, rtl: null, variables: null }
                expect(UniwindStore.getStyles('variable', {}, {}, context).styles.fontSize).toBe(expected)
                expect(UniwindStore.getStyles('literal', {}, {}, context).styles.fontSize).toBe(expected)
                const wrapper = ({ children }: PropsWithChildren) => createElement(ScopedTheme, { theme }, children)
                const { result, unmount } = renderHook(() => useCSSVariable('--alias'), { wrapper })
                expect(result.current).toBe(expected)
                unmount()
            }
        }

        UniwindStore.runtime.screen = { width: 900, height: 844 }
        const { result, unmount } = renderHook(() => useCSSVariable('--alias'), {
            wrapper: ({ children }: PropsWithChildren) => createElement(ScopedTheme, { theme: 'dark' }, children),
        })
        expect(result.current).toBe(40)
        unmount()
    })

    test.each([
        [
            'later global wins',
            ':root { --size: 10px; } @media (prefers-color-scheme: dark) { :root { --size: 24px; } } :root { --size: 12px; }',
            12,
            12,
        ],
        ['later media wins', ':root { --size: 12px; } @media (prefers-color-scheme: dark) { :root { --size: 24px; } }', 12, 24],
        ['important media wins', '@media (prefers-color-scheme: dark) { :root { --size: 24px !important; } } :root { --size: 12px; }', 12, 24],
        ['important global wins', ':root { --size: 12px !important; } @media (prefers-color-scheme: dark) { :root { --size: 24px; } }', 12, 12],
        [
            'later important wins',
            '@media (prefers-color-scheme: dark) { :root { --size: 24px !important; } } :root { --size: 12px !important; }',
            12,
            12,
        ],
    ])('%s across global and color-scheme declarations', (_label, css, light, dark) => {
        UniwindStore.reinit(compile(`${css} :root { --alias: var(--size); } .title { font-size: var(--alias); }`), ['light', 'dark'])
        for (const globalTheme of ['light', 'dark'] as const) {
            UniwindStore.runtime.currentThemeName = globalTheme
            for (const theme of ['light', 'dark'] as const) {
                const expected = theme === 'dark' ? dark : light
                const context = { scopedTheme: theme, rtl: null, variables: null }
                expect(UniwindStore.getStyles('title', {}, {}, context).styles.fontSize).toBe(expected)
                const { result, unmount } = renderHook(() => useCSSVariable('--alias'), {
                    wrapper: ({ children }: PropsWithChildren) => createElement(ScopedTheme, { theme }, children),
                })
                expect(result.current).toBe(expected)
                unmount()
            }
        }
    })

    test.each([Platform.iOS, Platform.Android] as const)('preserves %s platform fallbacks with and without global defaults', platform => {
        NativePlatform.OS = platform
        for (const global of [':root { --x: red; }', '']) {
            UniwindStore.runtime.currentThemeName = 'light'
            UniwindStore.runtime.screen = { width: 390, height: 844 }
            UniwindStore.runtime.orientation = Orientation.Portrait
            const compiled = compile(
                `
                ${global}
                @media native { :root { --x: yellow; } }
                @media ${platform} { :root { --x: blue; } }
                :root { --alias: var(--x); }
                @media (min-width: 640px) { :root:where(.dark) { --x: green; } }
                @media (orientation: landscape) { :root:where(.dark) { --x: purple; } }
                .color { color: var(--alias); }
            `,
                platform,
            )
            const context = { scopedTheme: 'dark', rtl: null, variables: null }
            for (
                const [width, orientation, expected] of [
                    [390, Orientation.Portrait, '#0000ff'],
                    [900, Orientation.Portrait, '#008000'],
                    [900, Orientation.Landscape, '#800080'],
                    [390, Orientation.Portrait, '#0000ff'],
                ] as const
            ) {
                UniwindStore.runtime.screen = { width, height: 844 }
                UniwindStore.runtime.orientation = orientation
                UniwindStore.reinit(compiled, ['light', 'dark'])
                const { result, unmount } = renderHook(() => useCSSVariable('--alias'), {
                    wrapper: ({ children }: PropsWithChildren) => createElement(ScopedTheme, { theme: 'dark' }, children),
                })
                expect(UniwindStore.getStyles('color', {}, {}, context).styles.color).toBe(expected)
                expect(result.current).toBe(expected)
                unmount()
            }
        }
    })

    test('tracks global theme changes through aliases and inherits the effective theme through variable overlays', () => {
        UniwindStore.runtime.currentThemeName = 'light'
        UniwindStore.reinit(
            compile(`
            :root { --size: 12px; --alias: var(--size); }
            @media (prefers-color-scheme: dark) { :root { --size: 24px; } }
            .title { font-size: var(--alias); }
        `),
            ['light', 'dark'],
        )
        const context = { scopedTheme: null, rtl: null, variables: null }
        expect(UniwindStore.getStyles('title', {}, {}, context).dependencies).toContain(StyleDependency.Theme)
        const global = renderHook(() => useCSSVariable('--alias'))
        const scoped = renderHook(() => useCSSVariable('--alias'), {
            wrapper: ({ children }: PropsWithChildren) =>
                createElement(ScopedTheme, { theme: 'dark' }, createElement(ScopedVariables, { variables: { '--unused': 1 } }, children)),
        })
        expect(global.result.current).toBe(12)
        expect(scoped.result.current).toBe(24)
        act(() => {
            UniwindStore.runtime.currentThemeName = 'dark'
            UniwindListener.notify([StyleDependency.Theme])
        })
        expect(global.result.current).toBe(24)
        expect(scoped.result.current).toBe(24)
        global.unmount()
        scoped.unmount()
    })
})
