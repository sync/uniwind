import { transform } from 'lightningcss'
import type { UniwindBundlerConfig } from '../config'

export const compileWebCSS = (bundlerConfig: UniwindBundlerConfig, tailwindCSS: string) => {
    return transform({
        code: Buffer.from(tailwindCSS),
        filename: 'uniwind.css',
        visitor: bundlerConfig.cssVisitor,
    }).code.toString()
}
