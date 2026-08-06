import { render } from '@testing-library/react-native'
import * as React from 'react'
import {
    CircularProgressIndicator,
    CircularWavyProgressIndicator,
    LinearProgressIndicator,
    LinearWavyProgressIndicator,
} from '../../../src/components/expo-ui/jetpack-compose/Progress'
import { TW_BLUE_500, TW_GREEN_500, TW_RED_500 } from '../../consts'

jest.mock('@expo/ui/jetpack-compose', () => {
    const React = require('react')
    const { View } = require('react-native')

    const createProgressIndicator = (testID: string) => (props: object) => React.createElement(View, { ...props, testID })

    return {
        CircularProgressIndicator: createProgressIndicator('expo-circular-progress'),
        CircularWavyProgressIndicator: createProgressIndicator('expo-circular-wavy-progress'),
        LinearProgressIndicator: createProgressIndicator('expo-linear-progress'),
        LinearWavyProgressIndicator: createProgressIndicator('expo-linear-wavy-progress'),
    }
})

const variants = [
    ['linear', LinearProgressIndicator, 'expo-linear-progress', { gapSize: 2 }],
    ['circular', CircularProgressIndicator, 'expo-circular-progress', { strokeWidth: 3 }],
    ['linear wavy', LinearWavyProgressIndicator, 'expo-linear-wavy-progress', { stopSize: 4 }],
    ['circular wavy', CircularWavyProgressIndicator, 'expo-circular-wavy-progress', {}],
] as const

describe('Expo UI Jetpack Compose Progress indicators', () => {
    test.each(variants)('maps color class names for %s and preserves native props', (_, Component, testID, variantProps) => {
        const modifiers = []
        const { getByTestId } = render(
            React.createElement(Component, {
                ...variantProps,
                colorClassName: 'accent-red-500',
                modifiers,
                progress: 0.5,
                trackColorClassName: 'accent-green-500',
            }),
        )
        const props = getByTestId(testID).props

        expect(props.color).toBe(TW_RED_500)
        expect(props.trackColor).toBe(TW_GREEN_500)
        expect(props.progress).toBe(0.5)
        expect(props.modifiers).toBe(modifiers)
        expect(props).toEqual(expect.objectContaining(variantProps))
    })

    test.each(variants)('preserves explicit color precedence for %s', (_, Component, testID) => {
        const { getByTestId } = render(
            React.createElement(Component, {
                colorClassName: 'accent-red-500',
                color: TW_BLUE_500,
                trackColor: TW_BLUE_500,
                trackColorClassName: 'accent-green-500',
            }),
        )

        expect(getByTestId(testID).props.color).toBe(TW_BLUE_500)
        expect(getByTestId(testID).props.trackColor).toBe(TW_BLUE_500)
    })
})
