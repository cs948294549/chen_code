import React from 'react';
import { Text } from 'ink';

function TextComponent({ children, ...props }) {
  return React.createElement(Text, props, children);
}

export default TextComponent;