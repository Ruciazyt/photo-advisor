const mockStop = jest.fn();
const mockSpeak = jest.fn();
const mockIsSpeaking = jest.fn();

module.exports = {
  speak: mockSpeak,
  stop: mockStop,
  isSpeaking: mockIsSpeaking,
};
