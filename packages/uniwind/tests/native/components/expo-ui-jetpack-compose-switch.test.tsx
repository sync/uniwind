import { render } from '@testing-library/react-native'
import * as React from 'react'
import { View } from 'react-native'
import { Switch } from '../../../src/components/expo-ui/jetpack-compose/Switch'
import { TW_BLUE_500, TW_GREEN_500, TW_RED_500 } from '../../consts'

jest.mock('@expo/ui/jetpack-compose', () => {
    const React = require('react')
    const { View } = require('react-native')

    const Switch = (props: object) => React.createElement(View, { ...props, testID: 'expo-switch' })
    Switch.ThumbContent = View
    Switch.DefaultIconSize = 18

    return { Switch }
})

describe('Expo UI Jetpack Compose Switch', () => {
    test('maps semantic color classes across enabled and disabled fields', () => {
        const { getByTestId } = render(
            <Switch
                checkedTrackColorClassName="accent-red-500"
                offTrackColorClassName="accent-green-500"
                thumbColorClassName="accent-blue-500"
                value
            />,
        )

        expect(getByTestId('expo-switch').props.colors).toEqual({
            checkedBorderColor: TW_RED_500,
            checkedTrackColor: TW_RED_500,
            disabledCheckedBorderColor: TW_RED_500,
            disabledCheckedThumbColor: TW_BLUE_500,
            disabledCheckedTrackColor: TW_RED_500,
            disabledUncheckedBorderColor: TW_GREEN_500,
            disabledUncheckedThumbColor: TW_BLUE_500,
            disabledUncheckedTrackColor: TW_GREEN_500,
            checkedThumbColor: TW_BLUE_500,
            uncheckedBorderColor: TW_GREEN_500,
            uncheckedThumbColor: TW_BLUE_500,
            uncheckedTrackColor: TW_GREEN_500,
        })
    })

    test('resolves disabled class variants', () => {
        const { getByTestId } = render(
            <Switch
                checkedTrackColorClassName="accent-red-500 disabled:accent-blue-500"
                enabled={false}
                value
            />,
        )

        expect(getByTestId('expo-switch').props.colors).toEqual(expect.objectContaining({
            checkedBorderColor: TW_BLUE_500,
            checkedTrackColor: TW_BLUE_500,
            disabledCheckedBorderColor: TW_BLUE_500,
            disabledCheckedTrackColor: TW_BLUE_500,
        }))
    })

    test('preserves individual colors object precedence', () => {
        const { getByTestId } = render(
            <Switch
                checkedTrackColorClassName="accent-red-500"
                colors={{ checkedTrackColor: TW_BLUE_500, disabledCheckedBorderColor: TW_GREEN_500 }}
                value
            />,
        )

        expect(getByTestId('expo-switch').props.colors).toEqual({
            checkedBorderColor: TW_RED_500,
            checkedTrackColor: TW_BLUE_500,
            disabledCheckedBorderColor: TW_GREEN_500,
            disabledCheckedTrackColor: TW_RED_500,
        })
    })

    test('leaves unresolved semantic groups unset', () => {
        const { getByTestId } = render(
            <Switch
                colors={{ uncheckedIconColor: TW_BLUE_500 }}
                offTrackColorClassName="accent-green-500"
                value
            />,
        )

        expect(getByTestId('expo-switch').props.colors).toEqual({
            disabledUncheckedBorderColor: TW_GREEN_500,
            disabledUncheckedTrackColor: TW_GREEN_500,
            uncheckedBorderColor: TW_GREEN_500,
            uncheckedIconColor: TW_BLUE_500,
            uncheckedTrackColor: TW_GREEN_500,
        })
    })

    test('preserves the upstream static component properties', () => {
        expect(Switch.ThumbContent).toBe(View)
        expect(Switch.DefaultIconSize).toBe(18)
    })
})
