import { UniwindBundlerConfig } from '@/bundler/config'
import type { UniwindConfig } from '@/bundler/types'
import { Platform } from '@/common/consts'
import type { MetroConfig } from 'metro-config'
import type { CustomResolver } from 'metro-resolver'
import { join } from 'node:path'
import { cacheStore, patchMetroGraphToSupportUncachedModules } from './patches'
import { nativeResolver, webResolver } from './resolvers'

const isUniwindRequest = (moduleName: string) => moduleName === 'uniwind' || moduleName.startsWith('uniwind/')

type ExpoTransformerConfig = NonNullable<MetroConfig['transformer']> & {
    _expoRelativeProjectRoot?: string
    _expoRouterPath?: string
    expo_customTransformerPath?: string | false
    postcssHash?: string | null
}

const isExpoMetroConfig = (config: MetroConfig) => {
    const transformerPath = config.transformerPath
    const transformer = config.transformer as ExpoTransformerConfig | undefined
    const hasExpoTransformerField = transformer
        ? '_expoRelativeProjectRoot' in transformer
            || '_expoRouterPath' in transformer
            || 'expo_customTransformerPath' in transformer
            || 'postcssHash' in transformer
        : false

    return Boolean(
        transformerPath?.includes('@expo/metro-config')
            || hasExpoTransformerField,
    )
}

export const withUniwindConfig = <T extends MetroConfig>(
    config: T,
    uniwindConfig: UniwindConfig,
): T => {
    const bundlerConfig = UniwindBundlerConfig.fromMetroConfig(uniwindConfig)
    const pinnedUniwindOrigin = join(config.projectRoot ?? process.cwd(), 'package.json')

    patchMetroGraphToSupportUncachedModules()

    return {
        ...config,
        cacheStores: [cacheStore],
        transformerPath: require.resolve('./transformer.cjs'),
        transformer: {
            ...config.transformer,
            uniwind: {
                ...bundlerConfig.toMetroConfig(),
                isExpoProject: isExpoMetroConfig(config),
            },
        },
        resolver: {
            ...config.resolver,
            sourceExts: [
                ...config.resolver?.sourceExts ?? [],
                'css',
            ],
            assetExts: config.resolver?.assetExts?.filter(
                ext => ext !== 'css',
            ),
            resolveRequest: (context, moduleName, platform) => {
                const baseResolver = config.resolver?.resolveRequest ?? context.resolveRequest
                const resolver: CustomResolver = (nextContext, nextModuleName, nextPlatform) => {
                    if (isUniwindRequest(nextModuleName)) {
                        return baseResolver(
                            {
                                ...nextContext,
                                originModulePath: pinnedUniwindOrigin,
                            },
                            nextModuleName,
                            nextPlatform,
                        )
                    }

                    return baseResolver(nextContext, nextModuleName, nextPlatform)
                }
                const platformResolver = platform === Platform.Web ? webResolver : nativeResolver
                const resolved = platformResolver({
                    context,
                    moduleName,
                    platform,
                    resolver,
                })

                return resolved
            },
        },
    }
}
