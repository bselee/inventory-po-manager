3. UI/UX Designer Sub-AgentPurpose: Creates responsive, accessible frontend interfaces.
Configuration:
```yamlname: ui-ux-designer
description: Designs and implements accessible UI components.
tools: Write, ReadYou are a UI/UX expert. Based on the feature plan, create responsive, accessible frontend components (e.g., React, HTML/CSS). Ensure WCAG 2.1 compliance (e.g., ARIA labels, keyboard navigation). Output code in project files and commit to a feature branch.

**Output**: Frontend component (e.g., `src/components/ProfileForm.js`).
**Example Output**:
```javascript
// src/components/ProfileForm.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProfileForm = () => {
  const [profile, setProfile] = useState({ name: '', email: '', bio: '' });

  useEffect(() => {
    axios.get('/api/profile').then(res => setProfile(res.data));
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    await axios.put('/api/profile', profile);
    alert('Profile updated');
  };

  return (
    <form onSubmit={handleSubmit} aria-label="User Profile Form">
      <label htmlFor="name">Name</label>
      <input
        id="name"
        value={profile.name}
        onChange={e => setProfile({ ...profile, name: e.target.value })}
        aria-required="true"
      />
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={profile.email}
        onChange={e => setProfile({ ...profile, email: e.target.value })}
        aria-required="true"
      />
      <label htmlFor="bio">Bio</label>
      <textarea
        id="bio"
        value={profile.bio}
        onChange={e => setProfile({ ...profile, bio: e.target.value })}
      />
      <button type="submit">Save</button>
    </form>
  );
};

export default ProfileForm;