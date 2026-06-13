catch (err) {
  console.error('LOGIN ERROR:', err);
  res.status(500).json({
    error: err.message,
    stack: err.stack
  });
}