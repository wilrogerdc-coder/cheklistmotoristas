
export const googleDriveService = {
  async ensureFolder(accessToken: string, folderName: string): Promise<string> {
    const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!searchRes.ok) throw new Error('Failed to search folder in Google Drive');
    const searchData = await searchRes.json();
    
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });

    if (!res.ok) throw new Error('Failed to create folder in Google Drive');
    const data = await res.json();
    return data.id;
  },

  async uploadFile(accessToken: string, base64Data: string, fileName: string, mimeType: string, folderId?: string): Promise<string> {
    try {
      // Fetch the base64 string to convert to a Blob
      const response = await fetch(base64Data);
      const blob = await response.blob();
      
      const metadata = {
        name: fileName,
        mimeType: mimeType,
        parents: folderId ? [folderId] : []
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', blob);

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        console.error('Drive Upload Error:', err);
        throw new Error('Failed to upload file to Drive');
      }

      const data = await res.json();
      return data.webViewLink || data.id;
    } catch (error) {
      console.error('uploadFile error:', error);
      throw error;
    }
  }
};
