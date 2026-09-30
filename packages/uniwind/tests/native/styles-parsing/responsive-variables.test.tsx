import { act, renderHook } from '@testing-library/react-native'
import { UniwindBundlerConfig } from '../../../src/bundler/config'
import { compileNativeCSS } from '../../../src/bundler/css-compiler/compileNativeCSS'
import { Orientation, Platform, StyleDependency } from '../../../src/common/consts'
import { UniwindListener } from '../../../src/core/listener'
import { UniwindStore } from '../../../src/core/native/store'
import type { GenerateStyleSheetsCallback } from '../../../src/core/types'
import { useCSSVariable } from '../../../src/hooks/useCSSVariable'

const context = { scopedTheme: null, rtl: null, variables: null }
const fixture = `
    :root { --phone: 32px; --desktop: 48px; --size: var(--phone); --alias: var(--size); --line: 1.25; }
    @media (width >= 768px) { :root { --size: 36px; } }
    @media (width >= 1024px) { :root { --size: var(--desktop); } }
    .title { font-size: var(--alias); line-height: var(--line); }
    .fixed { font-size: 22px !important; line-height: 28px !important; }
`

const compile = (css: string, platform = Platform.iOS) => {
    const config = UniwindBundlerConfig.fromMetroConfig({ cssEntryFile: './tests/test.css' }, platform)
    const code = compileNativeCSS(config, css)

    // oxlint-disable-next-line no-eval
    return eval(`(rt => ${code})`) as GenerateStyleSheetsCallback
}

const resolve = (className: string) => UniwindStore.getStyles(className, {}, {}, context)
const resize = (width: number) => {
    act(() => {
        UniwindStore.runtime.screen = { ...UniwindStore.runtime.screen, width }
        UniwindStore.runtime.orientation = width > UniwindStore.runtime.screen.height ? Orientation.Landscape : Orientation.Portrait
        UniwindListener.notify([StyleDependency.Dimensions, StyleDependency.Orientation])
    })
}

describe('responsive root variables', () => {
    const originalScreen = UniwindStore.runtime.screen
    const originalOrientation = UniwindStore.runtime.orientation
    const originalTheme = UniwindStore.runtime.currentThemeName

    beforeEach(() => {
        UniwindStore.runtime.currentThemeName = 'light'
        UniwindStore.runtime.screen = { width: 390, height: 844 }
        UniwindStore.runtime.orientation = Orientation.Portrait
        UniwindStore.reinit(compile(fixture), ['light', 'dark'])
    })

    afterEach(() => {
        UniwindStore.runtime.screen = originalScreen
        UniwindStore.runtime.orientation = originalOrientation
        UniwindStore.runtime.currentThemeName = originalTheme
        UniwindListener.notify([StyleDependency.Dimensions, StyleDependency.Orientation, StyleDependency.Theme])
    })

    test.each([Platform.iOS, Platform.Android])('resolves %s typography and invalidates cached aliases on resize', platform => {
        UniwindStore.reinit(compile(fixture, platform), ['light', 'dark'])
        for (const [width, size] of [[390, 32], [767, 32], [768, 36], [1023, 36], [1024, 48], [390, 32]]) {
            resize(width!)
            const result = resolve('title')
            expect(result.styles).toMatchObject({ fontSize: size, lineHeight: size! * 1.25 })
            expect(result.dependencies).toContain(StyleDependency.Dimensions)
            expect(resolve('title')).toBe(result)
            expect(resolve('title fixed').styles).toMatchObject({ fontSize: 22, lineHeight: 28 })
        }
    })

    test('updates mounted CSS-variable hooks without a parent rerender', () => {
        const { result, unmount } = renderHook(() => useCSSVariable(['--alias', '--line']))
        expect(result.current).toEqual([32, 1.25])
        resize(1024)
        expect(result.current).toEqual([48, 1.25])
        resize(390)
        expect(result.current).toEqual([32, 1.25])
        unmount()
    })

    test('keeps outer conditions on nested media queries and all sibling rules', () => {
        UniwindStore.reinit(
            compile(`
            :root { --a: 10px; --b: 12px; }
            @media (width >= 768px) {
                @media (orientation: landscape) { :root { --a: 20px; } :root { --b: 24px; } }
            }
            .a { font-size: var(--a); } .b { font-size: var(--b); }
        `),
            ['light', 'dark'],
        )
        for (const [width, a, b] of [[390, 10, 12], [800, 10, 12], [1024, 20, 24], [390, 10, 12]]) {
            resize(width!)
            expect(resolve('a').styles.fontSize).toBe(a)
            expect(resolve('b').styles.fontSize).toBe(b)
            expect(resolve('a').dependencies).toContain(StyleDependency.Orientation)
        }
    })

    test('preserves source order, important precedence, and missing-variable fallbacks', () => {
        UniwindStore.reinit(
            compile(`
            :root { --size: 10px; --priority: 11px !important; }
            @media (width <= 600px) { :root { --size: 12px; --priority: 30px; --only: 5px; } }
            @media (width >= 768px) { :root { --priority: 24px !important; } }
            :root { --size: 14px; }
            .x { font-size: var(--size); padding: var(--priority); margin: var(--only, 2px); }
        `),
            ['light', 'dark'],
        )
        expect(resolve('x').styles).toMatchObject({ fontSize: 14, padding: 11, margin: 5 })
        resize(900)
        expect(resolve('x').styles).toMatchObject({ fontSize: 14, padding: 24, margin: 2 })
    })

    test('preserves exclusive media-query bounds', () => {
        UniwindStore.reinit(
            compile(`
            :root { --size: 10px; }
            @media (width > 390px) { :root { --size: 20px; } }
            .x { font-size: var(--size); }
        `),
            ['light', 'dark'],
        )
        expect(resolve('x').styles.fontSize).toBe(10)
        resize(390.01)
        expect(resolve('x').styles.fontSize).toBe(20)
    })

    test('resolves conditional scoped defaults even when globals are declared later', () => {
        UniwindStore.reinit(
            compile(`
            @media (width >= 768px) { :root:where(.dark) { --size: 24px; } }
            :root { --size: 12px; --alias: var(--size); }
            .x { font-size: var(--alias); }
        `),
            ['light', 'dark'],
        )
        const dark = () => UniwindStore.getStyles('x', {}, {}, { ...context, scopedTheme: 'dark' }).styles
        expect(dark().fontSize).toBe(12)
        resize(900)
        expect(dark().fontSize).toBe(24)
        expect(resolve('x').styles.fontSize).toBe(12)
        resize(390)
        expect(dark().fontSize).toBe(12)
    })

    test('keeps static variables free of dimension dependencies', () => {
        UniwindStore.reinit(compile(':root { --size: 14px; } .x { font-size: var(--size); }'), ['light', 'dark'])
        expect(resolve('x').dependencies).not.toContain(StyleDependency.Dimensions)
    })
})
