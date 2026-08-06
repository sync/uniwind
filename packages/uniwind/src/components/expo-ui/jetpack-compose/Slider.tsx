import { Slider as ExpoSlider, type SliderProps } from '@expo/ui/jetpack-compose'
import { useAccentColor } from '../../native/useAccentColor'
import { copyComponentProperties } from '../../utils'

export const Slider = copyComponentProperties(ExpoSlider, (props: SliderProps) => {
    const {
        activeTickColorClassName,
        activeTrackColorClassName,
        colors: explicitColors,
        inactiveTickColorClassName,
        inactiveTrackColorClassName,
        thumbColorClassName,
        ...sliderProps
    } = props
    const state = { isDisabled: sliderProps.enabled === false }
    const activeTickColor = useAccentColor(activeTickColorClassName, props, state)
    const activeTrackColor = useAccentColor(activeTrackColorClassName, props, state)
    const inactiveTickColor = useAccentColor(inactiveTickColorClassName, props, state)
    const inactiveTrackColor = useAccentColor(inactiveTrackColorClassName, props, state)
    const thumbColor = useAccentColor(thumbColorClassName, props, state)
    const colors = activeTickColor !== undefined
            || activeTrackColor !== undefined
            || inactiveTickColor !== undefined
            || inactiveTrackColor !== undefined
            || thumbColor !== undefined
            || explicitColors !== undefined
        ? {
            ...(activeTickColor === undefined ? {} : { activeTickColor }),
            ...(activeTrackColor === undefined ? {} : { activeTrackColor }),
            ...(inactiveTickColor === undefined ? {} : { inactiveTickColor }),
            ...(inactiveTrackColor === undefined ? {} : { inactiveTrackColor }),
            ...(thumbColor === undefined ? {} : { thumbColor }),
            ...explicitColors,
        }
        : undefined

    return (
        <ExpoSlider
            {...sliderProps}
            colors={colors}
        />
    )
})
