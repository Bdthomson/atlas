import * as React from 'react'
import Select, { SelectProps } from '@material-ui/core/Select'
import MenuItem, { MenuItemProps } from '@material-ui/core/MenuItem'
import styled from 'styled-components'
import { OutlinedInput } from './'
import InputLabel from '@material-ui/core/InputLabel'

export const WrappedSelect = styled(
  React.forwardRef((props: SelectProps, ref: React.Ref<any>) => {
    return <Select {...props} ref={ref} />
  })
)<SelectProps>``

export const WrappedMenuItem = styled(
  React.forwardRef((props: MenuItemProps, ref: React.Ref<any>) => {
    //@ts-ignore
    return <MenuItem {...props} ref={ref} />
  })
)<MenuItemProps>``

// @ts-ignore
const PaddedLabel = styled<{ margin: string }, 'InputLabel'>(InputLabel)`
  transform: ${(props: any) =>
    props.margin === 'dense' ? 'translate(14px, 10px) scale(1)' : 'none'};
`

const PaddedSelect = styled(Select)`
  min-width: 100px;

  .MuiOutlinedInput-inputMarginDense {
    padding-bottom: 6.5px;
  }
`
export const OutlinedSelect = styled(
  React.forwardRef(
    (props: SelectProps & { label: string }, ref: React.Ref<any>) => {
      const inputLabel = React.useRef<any>(null)
      const [labelWidth, setLabelWidth] = React.useState(0)

      React.useEffect(() => {
        if (inputLabel !== null) {
          setLabelWidth(inputLabel.current!.offsetWidth)
        }
      }, [])

      return (
        <>
          <PaddedLabel
            ref={inputLabel}
            htmlFor={props.name}
            margin={props.margin}
          >
            {props.label}
          </PaddedLabel>
          <PaddedSelect
            {...props}
            input={
              <OutlinedInput
                margin={props.margin}
                labelWidth={labelWidth}
                name={props.name}
              />
            }
            ref={ref}
          >
            {props.children}
          </PaddedSelect>
        </>
      )
    }
  )
)<SelectProps & { label: string }>``
