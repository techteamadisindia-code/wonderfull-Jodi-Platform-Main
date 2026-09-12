const fs = require('fs');
const path = 'c:/Users/rushi/Downloads/wonderfull-Jodi-Platform-Main-main/wonderfull-Jodi-Platform-Main-main/frontend/app/admin/profiles/[id]/page.tsx';

let content = fs.readFileSync(path, 'utf8');

const startMarker = '{/* 7. Edit Profile Modal (Admin Protected Editing) */}';
const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
  console.error('Start marker not found!');
  process.exit(1);
}

const endMarker = '    </div>\n  );\n}';
const endIndex = content.lastIndexOf(endMarker);
if (endIndex === -1) {
  console.error('End marker not found!');
  process.exit(1);
}

const newModalSnippet = `{/* 7. Edit Profile Modal (Admin Protected Editing) */}
      <AdminEditProfileModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        profile={data}
        onSuccess={async () => {
          showToast('Profile updated successfully.');
          await loadProfile();
        }}
      />
    </div>
  );
}
`;

content = content.slice(0, startIndex) + newModalSnippet;
fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated [id]/page.tsx with AdminEditProfileModal!');
