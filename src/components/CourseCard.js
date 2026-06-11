import React from "react";
import { useNavigate } from "react-router-dom";

function CourseCard({ title, dept = "CSE E", bannerStyle = {} }) {
  const navigate = useNavigate();

  const handleClick = () => {
    const slug = encodeURIComponent(title.toLowerCase().replace(/\s+/g, "-"));
    navigate(`/subject/${slug}`);
  };

  return (
    <div className="course-card" onClick={handleClick} role="button">
      <div className="card-banner" style={bannerStyle}></div>
      <div className="card-body">
        <small>{dept}</small>
        <h3>{title}</h3>
      </div>
    </div>
  );
}

export default CourseCard;