const React = require('react');
const { Box } = require('ink');

function BoxComponent({ children, ...props }) {
  return React.createElement(Box, props, children);
}

module.exports = BoxComponent;