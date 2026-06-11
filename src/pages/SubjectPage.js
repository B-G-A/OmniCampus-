import React, { useContext } from "react";
import SubjectContext from "../context/SubjectContext";
import { useParams } from "react-router-dom";

function SubjectPage() {
  const { name } = useParams();

  // convert slug back to pretty title ('compiler-design' -> 'Compiler Design')
  const subject = name ? name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

  // look up materials from context using slug
  const { materials } = useContext(SubjectContext);
  const list = materials[name] || [];

  return (
    <div className="main">
      <h1>{subject}</h1>
      <h2>Available Files</h2>
      {list.length === 0 ? (
        <p>No files uploaded yet for this subject.</p>
      ) : (
        <ul>
          {list.map((m, idx) => (
            <li key={idx}>
              📄 <a href={m.url} target="_blank" rel="noreferrer">{m.name}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SubjectPage;