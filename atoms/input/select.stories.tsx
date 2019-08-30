import { storiesOf } from '@connexta/ace/@storybook/react'
import * as React from 'react'
import { FormControl, MenuItem, OutlinedSelect } from './'

const stories = storiesOf('Components | Select', module)

stories.add('Default', () => {
  const [value, setValue] = React.useState()

  return (
    <FormControl variant="outlined">
      <OutlinedSelect
        value={value}
        onChange={e => setValue(e.target.value)}
        label="Select"
      >
        <MenuItem value={'1'}>Choice 1</MenuItem>
        <MenuItem value={'2'}>Choice 2</MenuItem>
      </OutlinedSelect>
    </FormControl>
  )
})

stories.add('Dense', () => {
  const [value, setValue] = React.useState()

  return (
    <FormControl variant="outlined">
      <OutlinedSelect
        value={value}
        onChange={e => setValue(e.target.value)}
        label="Select"
        margin="dense"
      >
        <MenuItem value={''}>Reset</MenuItem>
        <MenuItem value={'1'}>Choice 1</MenuItem>
        <MenuItem value={'2'}>Choice 2</MenuItem>
      </OutlinedSelect>
    </FormControl>
  )
})
