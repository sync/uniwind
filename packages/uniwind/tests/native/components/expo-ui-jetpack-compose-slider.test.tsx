import { render } from '@testing-library/react-native'
import * as React from 'react'
import { View } from 'react-native'
import { Slider } from '../../../src/components/expo-ui/jetpack-compose/Slider'
import { TW_BLUE_500, TW_GREEN_500, TW_RED_500, TW_YELLOW_500 } from '../../consts'

jest.mock('@expo/ui/jetpack-compose', () => {
    const React = require('react')
    const { View } = require('react-native')

    const Slider = (props: object) => React.createElement(View, { ...props, testID: 'expo-slider' })
    Slider.Thumb = View
    Slider.Track = View

    return { Slider }
})

describe('Expo UI Jetpack Compose Slider', () => {
    test('maps semantic color classes to every slider color', () => {
        const { getByTestId } = render(
            <Slider
                activeTickColorClassName="accent-blue-500"
                activeTrackColorClassName="accent-red-500"
                inactiveTickColorClassName="accent-yellow-500"
                inactiveTrackColorClassName="accent-green-500"
                thumbColorClassName="accent-blue-500"
                value={0.5}
            />,
        )

        expect(getByTestId('expo-slider').props.colors).toEqual({
            activeTickColor: TW_BLUE_500,
            activeTrackColor: TW_RED_500,
            inactiveTickColor: TW_YELLOW_500,
            inactiveTrackColor: TW_GREEN_500,
            thumbColor: TW_BLUE_500,
        })
    })

    test('resolves disabled class variants', () => {
        const { getByTestId } = render(
            <Slider
                activeTrackColorClassName="accent-red-500 disabled:accent-blue-500"
                enabled={false}
                value={0.5}
            />,
        )

        expect(getByTestId('expo-slider').props.colors).toEqual({
            activeTrackColor: TW_BLUE_500,
        })
    })

    test('preserves explicit individual color precedence', () => {
        const { getByTestId } = render(
            <Slider
                activeTickColorClassName="accent-green-500"
                activeTrackColorClassName="accent-red-500"
                colors={{ activeTrackColor: TW_BLUE_500, inactiveTrackColor: TW_YELLOW_500 }}
                value={0.5}
            />,
        )

        expect(getByTestId('expo-slider').props.colors).toEqual({
            activeTickColor: TW_GREEN_500,
            activeTrackColor: TW_BLUE_500,
            inactiveTrackColor: TW_YELLOW_500,
        })
    })

    test('leaves unresolved colors unset', () => {
        const { getByTestId } = render(
            <Slider
                colors={{ inactiveTickColor: TW_GREEN_500 }}
                thumbColorClassName="accent-blue-500"
                value={0.5}
            />,
        )

        expect(getByTestId('expo-slider').props.colors).toEqual({
            inactiveTickColor: TW_GREEN_500,
            thumbColor: TW_BLUE_500,
        })
    })

    test('preserves the upstream static component properties', () => {
        expect(Slider.Thumb).toBe(View)
        expect(Slider.Track).toBe(View)
    })
})
