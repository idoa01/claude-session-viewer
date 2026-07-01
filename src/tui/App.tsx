import { Box, Text, useApp, useInput } from 'ink'

export default function App() {
  const { exit } = useApp()

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) exit()
  })

  return (
    <Box>
      <Text>sesh — press q to quit</Text>
    </Box>
  )
}
