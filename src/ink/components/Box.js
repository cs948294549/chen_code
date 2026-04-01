import React from 'react';
import { Box } from 'ink';

function BoxComponent({ children, ...props }) {
  return React.createElement(Box, props, children);
}

export default BoxComponent;