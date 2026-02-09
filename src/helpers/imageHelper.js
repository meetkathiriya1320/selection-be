export const toImageUrl = (path) => {
    if (!path) return path;
    const baseUrl = process.env.BASE_URL;

    // If path is already a full URL
    if (path.startsWith('http')) {
        // If it points to localhost:5173 (frontend), serve it from backend
        if (path.includes('localhost:5173')) {
            return path.replace('localhost:5173', 'localhost:5000');
        }
        // If it already points to correct backend or external, leave it
        return path;
    }

    // If relative path
    return `${baseUrl}${path}`;
};

export const transformImageUrls = (doc) => {
    if (!doc) return doc;
    const docObj = doc.toObject ? doc.toObject() : doc;

    // Handle Selection model
    if (docObj.photos && Array.isArray(docObj.photos)) {
        docObj.photos = docObj.photos.map(toImageUrl);
    }
    if (docObj.photo) {
        docObj.photo = toImageUrl(docObj.photo);
    }

    // Handle Banner and Category models
    if (docObj.image) {
        docObj.image = toImageUrl(docObj.image);
    }

    // Handle nested populated selection
    if (docObj.selection_id && typeof docObj.selection_id === 'object') {
        docObj.selection_id = transformImageUrls(docObj.selection_id);
    }

    return docObj;
};
