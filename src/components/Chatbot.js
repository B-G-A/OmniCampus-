import React, { useState } from "react";

function Chatbot() {

  const [open, setOpen] = useState(false);

  return (

    <>

      <button
        className="chat-btn"
        onClick={() => setOpen(!open)}
      >
        💬
      </button>

      {open && (

        <div className="chatbox">

          <div className="chat-header">
            OmniCampus Assistant
          </div>

          <div className="chat-body">

            <p>Hello! Ask me anything about your courses.</p>

          </div>

          <input placeholder="Ask a question..." />

        </div>

      )}

    </>

  );
}

export default Chatbot;