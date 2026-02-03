"""Tests for dev endpoints."""


def test_dev_config_endpoint(client, admin_headers):
    """Test dev config endpoint returns configuration."""
    response = client.get("/dev/config", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "env" in data
    assert "dev_auth_bypass" in data
    assert "database_url" in data


def test_dev_config_returns_config(client):
    """Test dev config endpoint returns configuration."""
    response = client.get("/dev/config")
    assert response.status_code == 200
    data = response.json()
    assert "env" in data
    assert "dev_auth_bypass" in data
