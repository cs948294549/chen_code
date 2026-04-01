// 结构化 IO 处理模块

/**
 * 输出消息
 * @param {string} message - 要输出的消息
 */
function output(message) {
  console.log(message);
}

/**
 * 输出错误消息
 * @param {string} message - 错误消息
 */
function outputError(message) {
  console.error(`Error: ${message}`);
}

/**
 * 输出成功消息
 * @param {string} message - 成功消息
 */
function outputSuccess(message) {
  console.log(`Success: ${message}`);
}

module.exports = {
  output,
  outputError,
  outputSuccess
};