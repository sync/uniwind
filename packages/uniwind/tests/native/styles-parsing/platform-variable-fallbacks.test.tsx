import { renderHook } from '@testing-library/react-native'
import { createElement, type PropsWithChildren } from 'react'
import { Platform as NativePlatform } from 'react-native'
import { UniwindBundlerConfig } from '../../../src/bundler/config'
import { compileNativeCSS } from '../../../src/bundler/css-compiler/compileNativeCSS'
import { Orientation, Platform } from '../../../src/common/consts'
import { ScopedTheme } from '../../../src/components/ScopedTheme/ScopedTheme.native'
import { UniwindStore } from '../../../src/core/native/store'
import type { GenerateStyleSheetsCallback } from '../../../src/core/types'
import { useCSSVariable } from '../../../src/hooks/useCSSVariable'

const targets = [
    [Platform.iOS, Platform.Native, 'ios', false],
    [Platform.Android, Platform.Native, 'android', false],
    [Platform.AppleTV, Platform.TV, 'ios', true],
    [Platform.AndroidTV, Platform.TV, 'android', true],
] as const

describe('platform variable fallbacks', () => {
    const originalPlatform = NativePlatform.OS
    const originalScreen = UniwindStore.runtime.screen
    const originalOrientation = UniwindStore.runtime.orientation
    const originalTheme = UniwindStore.runtime.currentThemeName

    afterEach(() => {
        jest.restoreAllMocks()
        NativePlatform.OS = originalPlatform
        UniwindStore.runtime.screen = originalScreen
        UniwindStore.runtime.orientation = originalOrientation
        UniwindStore.runtime.currentThemeName = originalTheme
    })

    test.each(targets)('%s inherits its %s defaults before the global defaults', (platform, commonPlatform, os, isTV) => {
        NativePlatform.OS = os
        jest.spyOn(NativePlatform, 'isTV', 'get').mockReturnValue(isTV)
        const config = UniwindBundlerConfig.fromMetroConfig({ cssEntryFile: './tests/test.css', isTV }, os)
        for (const global of [':root { --size: 2px; }', '']) {
            for (const sharedFirst of [true, false]) {
                const shared = `@media ${commonPlatform} {
                    :root { --size: 18px; }
                    @media (width >= 480px) { :root { --size: 20px; } }
                }`
                const specific = `@media ${platform} {
                    @media (width >= 640px) { :root { --size: 24px; } }
                    @media (orientation: landscape) { :root { --size: 32px; } }
                }`
                const code = compileNativeCSS(
                    config,
                    `
                    ${global}
                    ${sharedFirst ? shared + specific : specific + shared}
                    :root { --alias: var(--size); }
                    @media (width >= 1024px) { :root:where(.dark) { --size: 40px; } }
                    .title { font-size: var(--alias); }
                `,
                )
                // oxlint-disable-next-line no-eval
                const compiled = eval(`(rt => ${code})`) as GenerateStyleSheetsCallback
                for (
                    const [width, orientation, expected, darkExpected] of [
                        [390, Orientation.Portrait, 18, 18],
                        [500, Orientation.Portrait, 20, 20],
                        [640, Orientation.Portrait, 24, 24],
                        [700, Orientation.Landscape, 32, 32],
                        [1100, Orientation.Portrait, 24, 40],
                        [390, Orientation.Portrait, 18, 18],
                    ] as const
                ) {
                    UniwindStore.runtime.screen = { width, height: 844 }
                    UniwindStore.runtime.orientation = orientation
                    UniwindStore.runtime.currentThemeName = 'light'
                    UniwindStore.reinit(compiled, ['light', 'dark'])
                    for (const theme of ['light', 'dark'] as const) {
                        const value = theme === 'dark' ? darkExpected : expected
                        const context = { scopedTheme: theme, rtl: null, variables: null }
                        expect(UniwindStore.getStyles('title', {}, {}, context).styles.fontSize).toBe(value)
                        const { result, unmount } = renderHook(() => useCSSVariable('--alias'), {
                            wrapper: ({ children }: PropsWithChildren) => createElement(ScopedTheme, { theme }, children),
                        })
                        expect(result.current).toBe(value)
                        unmount()
                    }
                }
            }
        }
    })
})
