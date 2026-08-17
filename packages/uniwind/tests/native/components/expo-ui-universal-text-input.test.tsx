import { render } from '@testing-library/react-native'
import * as React from 'react'
import { StyleSheet } from 'react-native'
import { TextInput } from '../../../src/components/expo-ui/universal/native/TextInput'
import { TW_BLUE_500, TW_RED_500 } from '../../consts'

jest.mock('@expo/ui', () => {
    const React = require('react')
    const { View } = require('react-native')

    return {
        TextInput: (props: object) => React.createElement(View, { ...props, testID: 'expo-text-input' }),
    }
})

describe('Expo UI universal TextInput', () => {
    test('resolves container and text class names independently', () => {
        const { getByTestId } = render(
            <TextInput
                className="bg-red-500"
                textClassName="text-blue-500 text-xl"
            />,
        )

        const component = getByTestId('expo-text-input')

        expect(StyleSheet.flatten(component.props.style)).toEqual({
            backgroundColor: TW_RED_500,
        })
        expect(StyleSheet.flatten(component.props.textStyle)).toEqual({
            color: TW_BLUE_500,
            fontSize: 20,
            lineHeight: 28,
        })
    })

    test('preserves explicit style precedence', () => {
        const { getByTestId } = render(
            <TextInput
                className="bg-red-500"
                style={{ backgroundColor: TW_BLUE_500 }}
                textClassName="text-blue-500"
                textStyle={{ color: TW_RED_500 }}
            />,
        )

        const component = getByTestId('expo-text-input')

        expect(StyleSheet.flatten(component.props.style)).toEqual({
            backgroundColor: TW_BLUE_500,
        })
        expect(StyleSheet.flatten(component.props.textStyle)).toEqual({
            color: TW_RED_500,
        })
    })
})
