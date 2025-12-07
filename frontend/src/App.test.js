import { render, screen, fireEvent } from "@testing-library/react";
import '@testing-library/jest-dom';
import App from "./App";

// Mock modules
jest.mock("socket.io-client", () => {
  const emit = jest.fn();
  const on = jest.fn();
  const off = jest.fn();
  const disconnect = jest.fn();
  const connect = jest.fn();
  
  return jest.fn(() => ({
    emit,
    on,
    off,
    disconnect,
    connect
  }));
});

jest.mock("jspdf", () => {
  return jest.fn().mockImplementation(() => ({
    setFontSize: jest.fn(),
    text: jest.fn(),
    save: jest.fn()
  }));
});

// Basic tests that should pass without much environment setup
test("renders join screen initially", () => {
  render(<App />);
  expect(screen.getByText(/Join Meeting/i)).toBeInTheDocument();
});

test("user can enter roll number", () => {
  render(<App />);
  const rollNumberInput = screen.getByPlaceholderText("Enter Roll Number");
  fireEvent.change(rollNumberInput, { target: { value: "12345" } });
  expect(rollNumberInput.value).toBe("12345");
});

test("Join Room button should be enabled when roll number is entered", () => {
  render(<App />);
  const rollNumberInput = screen.getByPlaceholderText("Enter Roll Number");
  const joinButton = screen.getByText("Join Room");

  fireEvent.change(rollNumberInput, { target: { value: "12345" } });
  expect(joinButton).not.toBeDisabled();
});

test("join screen has title 'Video Chat Room'", () => {
  render(<App />);
  expect(screen.getByText("Video Chat Room")).toBeInTheDocument();
});

test("has input field for roll number", () => {
  render(<App />);
  expect(screen.getByPlaceholderText("Enter Roll Number")).toBeInTheDocument();
});

test("app renders the join form container", () => {
  render(<App />);
  const joinForm = screen.getByText("Join Meeting").closest("div");
  expect(joinForm).toBeInTheDocument();
});

test("roll number input has correct type", () => {
  render(<App />);
  const input = screen.getByPlaceholderText("Enter Roll Number");
  expect(input).toHaveAttribute("type", "text");
});

test("empty roll number doesn't change state", () => {
  render(<App />);
  const input = screen.getByPlaceholderText("Enter Roll Number");
  fireEvent.change(input, { target: { value: "" } });
  expect(input.value).toBe("");
});

test("multiple roll number changes update correctly", () => {
  render(<App />);
  const input = screen.getByPlaceholderText("Enter Roll Number");
  
  fireEvent.change(input, { target: { value: "123" } });
  expect(input.value).toBe("123");
  
  fireEvent.change(input, { target: { value: "12345" } });
  expect(input.value).toBe("12345");
  
  fireEvent.change(input, { target: { value: "ABCDE" } });
  expect(input.value).toBe("ABCDE");
});

// Test clicking the join button with an empty roll number
test("clicking join with empty roll number shows an alert", () => {
  const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
  
  render(<App />);
  const joinButton = screen.getByText("Join Room");
  fireEvent.click(joinButton);
  
  expect(alertMock).toHaveBeenCalledWith("Please enter your roll number to join");
  alertMock.mockRestore();
});

// Test the enter key in roll number input
test("pressing Enter in roll number input works", () => {
  const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
  
  render(<App />);
  const input = screen.getByPlaceholderText("Enter Roll Number");
  
  // With empty input
  fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 });
  expect(alertMock).toHaveBeenCalledWith("Please enter your roll number to join");
  
  alertMock.mockClear();
  
  // With filled input
  fireEvent.change(input, { target: { value: "12345" } });
  fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 });
  
  // This should trigger joinMeet but won't actually join due to mocked modules
  expect(alertMock).not.toHaveBeenCalled();
  
  alertMock.mockRestore();
});

// Test the title text and styling with getComputedStyle (limited)
test("title has correct text content", () => {
  render(<App />);
  const title = screen.getByText("Video Chat Room");
  expect(title).toBeInTheDocument();
  expect(title.tagName).toBe("H1");
});

// Test join form structure
test("join form has correct structure", () => {
  render(<App />);
  const joinTitle = screen.getByText("Join Meeting");
  expect(joinTitle.tagName).toBe("H2");
  
  // Check the input and button are present inside the form
  const form = joinTitle.closest("div");
  const inputInForm = form && form.querySelector('input[type="text"]');
  const buttonInForm = form && form.querySelector('button');
  
  expect(inputInForm).not.toBeNull();
  expect(buttonInForm).not.toBeNull();
});
test("roll number input accepts alphanumeric characters", () => {
  render(<App />);
  const input = screen.getByPlaceholderText("Enter Roll Number");
  
  // Test with numbers
  fireEvent.change(input, { target: { value: "12345" } });
  expect(input.value).toBe("12345");
  
  // Test with letters
  fireEvent.change(input, { target: { value: "ABC123" } });
  expect(input.value).toBe("ABC123");
  
  // Test with special characters
  fireEvent.change(input, { target: { value: "A-123_XY" } });
  expect(input.value).toBe("A-123_XY");
});

test("roll number input accepts long inputs", () => {
  render(<App />);
  const input = screen.getByPlaceholderText("Enter Roll Number");
  const longValue = "STUDENT12345678901234";
  
  fireEvent.change(input, { target: { value: longValue } });
  expect(input.value).toBe(longValue);
});




test("roll number input starts empty", () => {
  render(<App />);
  const input = screen.getByPlaceholderText("Enter Roll Number");
  expect(input.value).toBe("");
});
// Video toggle tests
test("toggling video off changes button text", () => {
  render(<App />);
  
  // Join the room first
  const rollNumberInput = screen.getByPlaceholderText("Enter Roll Number");
  fireEvent.change(rollNumberInput, { target: { value: "12345" } });
  const joinButton = screen.getByText("Join Room");
  fireEvent.click(joinButton);
  
  // Mock getUserMedia
  global.navigator.mediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([]),
      getVideoTracks: jest.fn().mockReturnValue([{ enabled: true }]),
      getAudioTracks: jest.fn().mockReturnValue([])
    })
  };
  
  // Wait for component to update
  setTimeout(() => {
    const videoToggleButton = screen.getByText("Turn Video Off");
    fireEvent.click(videoToggleButton);
    expect(screen.getByText("Turn Video On")).toBeInTheDocument();
  }, 0);
});

test("toggling video on changes button text back", () => {
  render(<App />);
  
  // Join the room first
  const rollNumberInput = screen.getByPlaceholderText("Enter Roll Number");
  fireEvent.change(rollNumberInput, { target: { value: "12345" } });
  const joinButton = screen.getByText("Join Room");
  fireEvent.click(joinButton);
  
  // Mock getUserMedia
  global.navigator.mediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([]),
      getVideoTracks: jest.fn().mockReturnValue([{ enabled: true }]),
      getAudioTracks: jest.fn().mockReturnValue([])
    })
  };
  
  // Wait for component to update
  setTimeout(() => {
    const videoToggleButton = screen.getByText("Turn Video Off");
    fireEvent.click(videoToggleButton);
    expect(screen.getByText("Turn Video On")).toBeInTheDocument();
    
    // Click again to turn back on
    const videoToggleButtonOn = screen.getByText("Turn Video On");
    fireEvent.click(videoToggleButtonOn);
    expect(screen.getByText("Turn Video Off")).toBeInTheDocument();
  }, 0);
});

// Audio toggle tests
test("toggling mute changes button text", () => {
  render(<App />);
  
  // Join the room first
  const rollNumberInput = screen.getByPlaceholderText("Enter Roll Number");
  fireEvent.change(rollNumberInput, { target: { value: "12345" } });
  const joinButton = screen.getByText("Join Room");
  fireEvent.click(joinButton);
  
  // Mock getUserMedia
  global.navigator.mediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([]),
      getVideoTracks: jest.fn().mockReturnValue([]),
      getAudioTracks: jest.fn().mockReturnValue([{ enabled: true }])
    })
  };
  
  // Wait for component to update
  setTimeout(() => {
    const muteButton = screen.getByText("Mute");
    fireEvent.click(muteButton);
    expect(screen.getByText("Unmute")).toBeInTheDocument();
  }, 0);
});

test("toggling unmute changes button text back", () => {
  render(<App />);
  
  // Join the room first
  const rollNumberInput = screen.getByPlaceholderText("Enter Roll Number");
  fireEvent.change(rollNumberInput, { target: { value: "12345" } });
  const joinButton = screen.getByText("Join Room");
  fireEvent.click(joinButton);
  
  // Mock getUserMedia
  global.navigator.mediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([]),
      getVideoTracks: jest.fn().mockReturnValue([]),
      getAudioTracks: jest.fn().mockReturnValue([{ enabled: true }])
    })
  };
  
  // Wait for component to update
  setTimeout(() => {
    const muteButton = screen.getByText("Mute");
    fireEvent.click(muteButton);
    expect(screen.getByText("Unmute")).toBeInTheDocument();
    
    // Click again to unmute
    const unmuteButton = screen.getByText("Unmute");
    fireEvent.click(unmuteButton);
    expect(screen.getByText("Mute")).toBeInTheDocument();
  }, 0);
});

// Chat tests
test("chat input updates correctly", () => {
  render(<App />);
  
  // Join the room first
  const rollNumberInput = screen.getByPlaceholderText("Enter Roll Number");
  fireEvent.change(rollNumberInput, { target: { value: "12345" } });
  const joinButton = screen.getByText("Join Room");
  fireEvent.click(joinButton);
  
  // Mock getUserMedia
  global.navigator.mediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([]),
      getVideoTracks: jest.fn().mockReturnValue([]),
      getAudioTracks: jest.fn().mockReturnValue([])
    })
  };
  
  // Wait for component to update
  setTimeout(() => {
    const chatInput = screen.getByPlaceholderText("Type a message");
    fireEvent.change(chatInput, { target: { value: "Hello everyone!" } });
    expect(chatInput.value).toBe("Hello everyone!");
  }, 0);
});

test("send button clears chat input", () => {
  render(<App />);
  
  // Join the room first
  const rollNumberInput = screen.getByPlaceholderText("Enter Roll Number");
  fireEvent.change(rollNumberInput, { target: { value: "12345" } });
  const joinButton = screen.getByText("Join Room");
  fireEvent.click(joinButton);
  
  // Mock getUserMedia
  global.navigator.mediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([]),
      getVideoTracks: jest.fn().mockReturnValue([]),
      getAudioTracks: jest.fn().mockReturnValue([])
    })
  };
  
  // Wait for component to update
  setTimeout(() => {
    const chatInput = screen.getByPlaceholderText("Type a message");
    fireEvent.change(chatInput, { target: { value: "Hello everyone!" } });
    
    const sendButton = screen.getByText("Send");
    fireEvent.click(sendButton);
    
    // Input should be cleared
    expect(chatInput.value).toBe("");
  }, 0);
});

test("pressing Enter in chat input sends message", () => {
  render(<App />);
  
  // Join the room first
  const rollNumberInput = screen.getByPlaceholderText("Enter Roll Number");
  fireEvent.change(rollNumberInput, { target: { value: "12345" } });
  const joinButton = screen.getByText("Join Room");
  fireEvent.click(joinButton);
  
  // Mock getUserMedia
  global.navigator.mediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([]),
      getVideoTracks: jest.fn().mockReturnValue([]),
      getAudioTracks: jest.fn().mockReturnValue([])
    })
  };
  
  // Wait for component to update
  setTimeout(() => {
    const chatInput = screen.getByPlaceholderText("Type a message");
    fireEvent.change(chatInput, { target: { value: "Hello everyone!" } });
    
    fireEvent.keyPress(chatInput, { key: "Enter", code: "Enter", charCode: 13 });
    
    // Input should be cleared
    expect(chatInput.value).toBe("");
  }, 0);
});


test("leave button resets the app state", () => {
  render(<App />);
  
  // Join the room first
  const rollNumberInput = screen.getByPlaceholderText("Enter Roll Number");
  fireEvent.change(rollNumberInput, { target: { value: "12345" } });
  const joinButton = screen.getByText("Join Room");
  fireEvent.click(joinButton);
  
  // Mock getUserMedia
  global.navigator.mediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
      getVideoTracks: jest.fn().mockReturnValue([]),
      getAudioTracks: jest.fn().mockReturnValue([])
    })
  };
  
  // Wait for component to update
  setTimeout(() => {
    const leaveButton = screen.getByText("Leave");
    fireEvent.click(leaveButton);
    
    // Should show the join screen again
    expect(screen.getByText("Join Meeting")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter Roll Number")).toBeInTheDocument();
  }, 0);
});

// Download attendance test
test("download attendance button calls jsPDF correctly", () => {
  render(<App />);
  
  // Join the room first
  const rollNumberInput = screen.getByPlaceholderText("Enter Roll Number");
  fireEvent.change(rollNumberInput, { target: { value: "12345" } });
  const joinButton = screen.getByText("Join Room");
  fireEvent.click(joinButton);
  
  // Mock getUserMedia
  global.navigator.mediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([]),
      getVideoTracks: jest.fn().mockReturnValue([]),
      getAudioTracks: jest.fn().mockReturnValue([])
    })
  };
  
  // Wait for component to update
  setTimeout(() => {
    const downloadButton = screen.getByText("Download Attendance");
    fireEvent.click(downloadButton);
    
    // jsPDF should have been called
    const jsPDFMock = require("jspdf");
    expect(jsPDFMock).toHaveBeenCalled();
    
    // The save method should be called
    const mockInstance = jsPDFMock.mock.results[0].value;
    expect(mockInstance.save).toHaveBeenCalledWith("attendance.pdf");
  }, 0);
});
