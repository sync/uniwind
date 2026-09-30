import { UniwindBundlerConfig } from '../../../src/bundler/config'
import { compileNativeCSS } from '../../../src/bundler/css-compiler/compileNativeCSS'
import { Platform, StyleDependency } from '../../../src/common/consts'
import { UniwindStore } from '../../../src/core/native/store'
import type { GenerateStyleSheetsCallback } from '../../../src/core/types'

const dependencies = (css: string, platform: Platform) => {
    const config = new UniwindBundlerConfig({ cssEntryFile: './tests/test.css' }, platform)
    const code = compileNativeCSS(
        config,
        `${css}
        :root { --alias: var(--size); }
        .title { font-size: var(--alias); }
    `,
    )
    // oxlint-disable-next-line no-eval
    const compiled = eval(`(rt => ${code})`) as GenerateStyleSheetsCallback
    return compiled(UniwindStore.runtime).stylesheet.title![0]!.dependencies
}

describe('variable platform dependencies', () => {
    test.each([
        [Platform.Android, Platform.iOS, Platform.TV],
        [Platform.iOS, Platform.Android, Platform.TV],
        [Platform.AndroidTV, Platform.AppleTV, Platform.Native],
        [Platform.AppleTV, Platform.AndroidTV, Platform.Native],
    ])('%s ignores responsive aliases from %s and %s', (platform, otherPlatform, otherCommon) => {
        const deps = dependencies(
            `
            :root { --size: 18px; }
            @media ${otherPlatform} {
                :root { --size: var(--other); }
                @media (width >= 640px) { :root { --other: 24px; } }
            }
            @media ${otherCommon} {
                @media (orientation: landscape) { :root { --size: 32px; } }
            }
        `,
            platform,
        )
        expect(deps).not.toContain(StyleDependency.Dimensions)
        expect(deps).not.toContain(StyleDependency.Orientation)
    })

    test.each([
        [Platform.Android, Platform.Native],
        [Platform.iOS, Platform.Native],
        [Platform.AndroidTV, Platform.TV],
        [Platform.AppleTV, Platform.TV],
    ])('%s retains responsive shared %s fallbacks and theme aliases', (platform, commonPlatform) => {
        const deps = dependencies(
            `
            :root { --size: 18px; }
            @media ${commonPlatform} {
                @media (width >= 640px) { :root { --size: 24px; } }
            }
            @media ${platform} {
                @media (orientation: landscape) { :root { --size: 32px; } }
            }
            :root:where(.dark) { --size: var(--themed); }
            @media (width >= 1024px) { :root:where(.dark) { --themed: 40px; } }
        `,
            platform,
        )
        expect(deps).toContain(StyleDependency.Dimensions)
        expect(deps).toContain(StyleDependency.Orientation)
        expect(deps).toContain(StyleDependency.Theme)
    })
})
