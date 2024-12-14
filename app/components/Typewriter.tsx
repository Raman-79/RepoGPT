import React, { useState, useEffect } from "react";
import { TypewriterProps } from "../interfaces";

const Typewriter: React.FC<TypewriterProps> = ({ text, delay }) => {
  const [currText, setCurrText] = useState('');
  const [currIndex, setCurrIndex] = useState(0);

  useEffect(() => {
    if (currIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrText(prevText => prevText + text[currIndex]);
        setCurrIndex(prevIndex => prevIndex + 1);
      }, delay);

      return () => clearTimeout(timeout);
    }
  }, [currIndex, delay, text]);

  return (
    <span>{currText}</span>
  );
};

export default Typewriter;