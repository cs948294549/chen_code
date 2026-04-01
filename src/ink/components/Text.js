const React = require('react');
const { Text } = require('ink');

function TextComponent({ children, ...props }) {
  return React.createElement(Text, props, children);
}

module.exports = TextComponent;