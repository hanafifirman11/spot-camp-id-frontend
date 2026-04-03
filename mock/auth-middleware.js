module.exports = (req, res, next) => {
  // --- Manual URL Rewriting (Super Stable Version) ---
  const url = req.url;

  if (url.includes('/api/v1/public/campsites')) {
    req.url = url.replace('/api/v1/public/campsites', '/campsites');
  } 
  else if (url.includes('/api/v1/public/maps/')) {
    const configMatch = url.match(/\/api\/v1\/public\/maps\/(\d+)\/config/);
    if (configMatch) {
      req.url = `/map-configs?campsiteId=${configMatch[1]}`;
    }

    const availabilityMatch = url.match(/\/api\/v1\/public\/maps\/(\d+)\/availability/);
    if (availabilityMatch) {
      return res.json({});
    }
  }
  else if (url.includes('/map')) {
    // Menangani /api/v1/campsites/1/map -> /map-configs?campsiteId=1
    const match = url.match(/\/api\/v1\/campsites\/(\d+)\/map/);
    if (match) {
      req.url = `/map-configs?campsiteId=${match[1]}`;
    }
  }
  else if (url.includes('/api/v1/campsites/')) {
    // Menangani /api/v1/campsites/1 -> /campsites/1
    req.url = url.replace('/api/v1/campsites/', '/campsites/');
  }
  else if (url.includes('/api/v1/auth/forgot-password')) {
    if (req.method === 'POST') {
      return res.status(200).json({ message: 'Password reset email sent' });
    }
  }

  // --- Mock Auth Responses ---
  if (req.method === 'POST') {
    if (req.path === '/api/v1/auth/login') {
      return res.json({
        accessToken: 'mock-jwt-token-12345',
        expiresIn: 3600,
        user: { id: 1, email: req.body.email, firstName: 'Mock', lastName: 'User', role: 'CAMPER' }
      });
    }
    
    if (req.path === '/api/v1/auth/register') {
      return res.status(201).json({
        accessToken: 'mock-jwt-token-register-123',
        expiresIn: 3600,
        user: { id: 2, email: req.body.email, firstName: req.body.firstName, lastName: req.body.lastName, role: req.body.role }
      });
    }
  }
  next();
};
