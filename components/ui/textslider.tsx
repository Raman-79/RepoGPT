import React, { useState, useEffect } from "react";
// Idk why this is made

const texts = [ "Welcome to our website!",
    "We provide excellent services.",
    "Contact us for more information.",]
const SentenceSlideshow = ({ sentences=texts, interval = 3000 }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % sentences.length);
    }, interval);
    return () => clearInterval(timer);
  }, [sentences, interval]);

  return (
    <div className="relative h-16 overflow-hidden text-center">
      {sentences.map((sentence:string, index:number) => (
        <div
          key={index}
          className={`absolute w-full transition-opacity duration-1000 ease-in-out ${
            current === index ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"
          }`}
        >
          {sentence}
        </div>
      ))}
    </div>
  );
};

export default SentenceSlideshow;
