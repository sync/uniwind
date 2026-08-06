import { Switch as ExpoSwitch, type SwitchProps } from '@expo/ui/jetpack-compose'
import { useAccentColor } from '../../native/useAccentColor'
import { copyComponentProperties } from '../../utils'

export const Switch = copyComponentProperties(ExpoSwitch, (props: SwitchProps) => {
    const { checkedTrackColorClassName, colors: explicitColors, offTrackColorClassName, thumbColorClassName, ...switchProps } = props
    const state = { isDisabled: switchProps.enabled === false }
    const onTrackColor = useAccentColor(checkedTrackColorClassName, props, state)
    const offTrackColor = useAccentColor(offTrackColorClassName, props, state)
    const thumbColor = useAccentColor(thumbColorClassName, props, state)
    const colors = onTrackColor !== undefined || offTrackColor !== undefined || thumbColor !== undefined || explicitColors !== undefined
        ? {
            ...(onTrackColor === undefined
                ? {}
                : {
                    checkedBorderColor: onTrackColor,
                    checkedTrackColor: onTrackColor,
                    disabledCheckedBorderColor: onTrackColor,
                    disabledCheckedTrackColor: onTrackColor,
                }),
            ...(offTrackColor === undefined
                ? {}
                : {
                    disabledUncheckedBorderColor: offTrackColor,
                    disabledUncheckedTrackColor: offTrackColor,
                    uncheckedBorderColor: offTrackColor,
                    uncheckedTrackColor: offTrackColor,
                }),
            ...(thumbColor === undefined
                ? {}
                : {
                    checkedThumbColor: thumbColor,
                    disabledCheckedThumbColor: thumbColor,
                    disabledUncheckedThumbColor: thumbColor,
                    uncheckedThumbColor: thumbColor,
                }),
            ...explicitColors,
        }
        : undefined

    return (
        <ExpoSwitch
            {...switchProps}
            colors={colors}
        />
    )
})
