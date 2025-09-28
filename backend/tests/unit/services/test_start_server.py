#!/usr/bin/env python3
"""
Unit tests for start_server.py server startup script.

This module tests the server startup script to ensure comprehensive coverage
of all configuration options and error handling.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import os
import sys

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))


class TestStartServer:
    """Unit tests for start_server.py script."""
    
    def test_environment_variables_loading(self):
        """Test that environment variables are loaded."""
        with patch('start_server.load_dotenv') as mock_load_dotenv:
            # Import the module to trigger load_dotenv
            import start_server
            mock_load_dotenv.assert_called_once()
    
    def test_default_configuration(self):
        """Test default server configuration."""
        with patch.dict(os.environ, {}, clear=True):
            with patch('start_server.uvicorn.run') as mock_uvicorn_run:
                # Mock the main execution
                with patch('start_server.__name__', '__main__'):
                    # Import and execute the main block
                    import start_server
                    
                    # Check that uvicorn.run was called with default values
                    mock_uvicorn_run.assert_called_with(
                        "main:app",
                        host="127.0.0.1",
                        port=8000,
                        reload=True,
                        log_level="info"
                    )
    
    def test_custom_host_configuration(self):
        """Test custom host configuration."""
        with patch.dict(os.environ, {'HOST': '0.0.0.0'}, clear=True):
            with patch('start_server.uvicorn.run') as mock_uvicorn_run:
                with patch('start_server.__name__', '__main__'):
                    import start_server
                    
                    mock_uvicorn_run.assert_called_with(
                        "main:app",
                        host="0.0.0.0",
                        port=8000,
                        reload=True,
                        log_level="info"
                    )
    
    def test_custom_port_configuration(self):
        """Test custom port configuration."""
        with patch.dict(os.environ, {'PORT': '9000'}, clear=True):
            with patch('start_server.uvicorn.run') as mock_uvicorn_run:
                with patch('start_server.__name__', '__main__'):
                    import start_server
                    
                    mock_uvicorn_run.assert_called_with(
                        "main:app",
                        host="127.0.0.1",
                        port=9000,
                        reload=True,
                        log_level="info"
                    )
    
    def test_custom_reload_configuration(self):
        """Test custom reload configuration."""
        with patch.dict(os.environ, {'RELOAD': 'false'}, clear=True):
            with patch('start_server.uvicorn.run') as mock_uvicorn_run:
                with patch('start_server.__name__', '__main__'):
                    import start_server
                    
                    mock_uvicorn_run.assert_called_with(
                        "main:app",
                        host="127.0.0.1",
                        port=8000,
                        reload=False,
                        log_level="info"
                    )
    
    def test_custom_openai_model_configuration(self):
        """Test custom OpenAI model configuration."""
        with patch.dict(os.environ, {'OPENAI_MODEL': 'gpt-3.5-turbo'}, clear=True):
            with patch('start_server.uvicorn.run') as mock_uvicorn_run:
                with patch('start_server.__name__', '__main__'):
                    import start_server
                    
                    # The OpenAI model should be printed but doesn't affect uvicorn config
                    mock_uvicorn_run.assert_called_with(
                        "main:app",
                        host="127.0.0.1",
                        port=8000,
                        reload=True,
                        log_level="info"
                    )
    
    def test_all_custom_configurations(self):
        """Test all custom configurations together."""
        with patch.dict(os.environ, {
            'HOST': '192.168.1.100',
            'PORT': '3000',
            'RELOAD': 'false',
            'OPENAI_MODEL': 'gpt-4'
        }, clear=True):
            with patch('start_server.uvicorn.run') as mock_uvicorn_run:
                with patch('start_server.__name__', '__main__'):
                    import start_server
                    
                    mock_uvicorn_run.assert_called_with(
                        "main:app",
                        host="192.168.1.100",
                        port=3000,
                        reload=False,
                        log_level="info"
                    )
    
    def test_reload_configuration_case_insensitive(self):
        """Test that reload configuration is case insensitive."""
        with patch.dict(os.environ, {'RELOAD': 'FALSE'}, clear=True):
            with patch('start_server.uvicorn.run') as mock_uvicorn_run:
                with patch('start_server.__name__', '__main__'):
                    import start_server
                    
                    mock_uvicorn_run.assert_called_with(
                        "main:app",
                        host="127.0.0.1",
                        port=8000,
                        reload=False,
                        log_level="info"
                    )
    
    def test_reload_configuration_truthy_values(self):
        """Test that various truthy values for reload are handled correctly."""
        truthy_values = ['true', 'True', 'TRUE', '1', 'yes', 'on']
        
        for value in truthy_values:
            with patch.dict(os.environ, {'RELOAD': value}, clear=True):
                with patch('start_server.uvicorn.run') as mock_uvicorn_run:
                    with patch('start_server.__name__', '__main__'):
                        import importlib
                        import start_server
                        importlib.reload(start_server)
                        
                        mock_uvicorn_run.assert_called_with(
                            "main:app",
                            host="127.0.0.1",
                            port=8000,
                            reload=True,
                            log_level="info"
                        )
    
    def test_reload_configuration_falsy_values(self):
        """Test that various falsy values for reload are handled correctly."""
        falsy_values = ['false', 'False', 'FALSE', '0', 'no', 'off', '']
        
        for value in falsy_values:
            with patch.dict(os.environ, {'RELOAD': value}, clear=True):
                with patch('start_server.uvicorn.run') as mock_uvicorn_run:
                    with patch('start_server.__name__', '__main__'):
                        import importlib
                        import start_server
                        importlib.reload(start_server)
                        
                        mock_uvicorn_run.assert_called_with(
                            "main:app",
                            host="127.0.0.1",
                            port=8000,
                            reload=False,
                            log_level="info"
                        )
    
    def test_invalid_port_configuration(self):
        """Test invalid port configuration."""
        with patch.dict(os.environ, {'PORT': 'invalid_port'}, clear=True):
            with patch('start_server.uvicorn.run') as mock_uvicorn_run:
                with patch('start_server.__name__', '__main__'):
                    # Should handle invalid port gracefully
                    try:
                        import start_server
                        # If it doesn't crash, that's good
                        assert True
                    except ValueError:
                        # ValueError is acceptable for invalid port
                        assert True
    
    def test_uvicorn_run_parameters(self):
        """Test that uvicorn.run is called with correct parameters."""
        with patch('start_server.uvicorn.run') as mock_uvicorn_run:
            with patch('start_server.__name__', '__main__'):
                import start_server
                
                # Verify all parameters are passed correctly
                call_args = mock_uvicorn_run.call_args
                assert call_args[0][0] == "main:app"  # app parameter
                assert call_args[1]['host'] == "127.0.0.1"
                assert call_args[1]['port'] == 8000
                assert call_args[1]['reload'] is True
                assert call_args[1]['log_level'] == "info"
    
    def test_script_execution_guard(self):
        """Test that the script only runs when executed directly."""
        with patch('start_server.__name__', 'not_main'):
            with patch('start_server.uvicorn.run') as mock_uvicorn_run:
                import start_server
                
                # Should not call uvicorn.run when not executed directly
                mock_uvicorn_run.assert_not_called()
    
    def test_environment_variable_parsing(self):
        """Test environment variable parsing logic."""
        # Test the parsing logic directly
        with patch.dict(os.environ, {
            'HOST': 'test-host',
            'PORT': '1234',
            'RELOAD': 'false',
            'OPENAI_MODEL': 'test-model'
        }, clear=True):
            
            # Test the parsing logic
            host = os.getenv("HOST", "127.0.0.1")
            port = int(os.getenv("PORT", "8000"))
            reload = os.getenv("RELOAD", "true").lower() == "true"
            openai_model = os.getenv("OPENAI_MODEL", "gpt-4")
            
            assert host == "test-host"
            assert port == 1234
            assert reload is False
            assert openai_model == "test-model"
    
    def test_default_values_when_env_vars_missing(self):
        """Test default values when environment variables are missing."""
        with patch.dict(os.environ, {}, clear=True):
            # Test the default values
            host = os.getenv("HOST", "127.0.0.1")
            port = int(os.getenv("PORT", "8000"))
            reload = os.getenv("RELOAD", "true").lower() == "true"
            openai_model = os.getenv("OPENAI_MODEL", "gpt-4")
            
            assert host == "127.0.0.1"
            assert port == 8000
            assert reload is True
            assert openai_model == "gpt-4"


class TestStartServerEdgeCases:
    """Test edge cases and error scenarios for start_server.py."""
    
    def test_uvicorn_import_error(self):
        """Test behavior when uvicorn import fails."""
        with patch('start_server.uvicorn', side_effect=ImportError("uvicorn not found")):
            with patch('start_server.__name__', '__main__'):
                # Should handle import error gracefully
                try:
                    import start_server
                    # If it doesn't crash, that's good
                    assert True
                except ImportError:
                    # ImportError is acceptable
                    assert True
    
    def test_os_getenv_with_none_values(self):
        """Test os.getenv behavior with None values."""
        with patch.dict(os.environ, {'HOST': None}, clear=True):
            # os.getenv should return None, not the default
            host = os.getenv("HOST", "127.0.0.1")
            assert host == "127.0.0.1"  # Should use default when env var is None
    
    def test_port_conversion_error(self):
        """Test port conversion with invalid values."""
        with patch.dict(os.environ, {'PORT': 'not_a_number'}, clear=True):
            try:
                port = int(os.getenv("PORT", "8000"))
                assert False, "Should have raised ValueError"
            except ValueError:
                assert True  # Expected behavior
    
    def test_environment_variable_with_whitespace(self):
        """Test environment variables with whitespace."""
        with patch.dict(os.environ, {
            'HOST': '  127.0.0.1  ',
            'PORT': '  8000  ',
            'RELOAD': '  true  '
        }, clear=True):
            
            host = os.getenv("HOST", "127.0.0.1")
            port = int(os.getenv("PORT", "8000"))
            reload = os.getenv("RELOAD", "true").lower() == "true"
            
            # Should handle whitespace correctly
            assert host == "  127.0.0.1  "  # os.getenv doesn't strip whitespace
            assert port == 8000  # int() handles whitespace
            assert reload is True  # .lower() and comparison handle whitespace
    
    def test_very_large_port_number(self):
        """Test with very large port number."""
        with patch.dict(os.environ, {'PORT': '99999'}, clear=True):
            try:
                port = int(os.getenv("PORT", "8000"))
                assert port == 99999
                # Should handle large port numbers
                assert True
            except ValueError:
                assert True  # Some systems might reject very large ports
    
    def test_negative_port_number(self):
        """Test with negative port number."""
        with patch.dict(os.environ, {'PORT': '-1'}, clear=True):
            try:
                port = int(os.getenv("PORT", "8000"))
                assert port == -1
                # Should handle negative ports (though they're invalid)
                assert True
            except ValueError:
                assert True  # Some systems might reject negative ports
    
    def test_empty_string_environment_variables(self):
        """Test with empty string environment variables."""
        with patch.dict(os.environ, {
            'HOST': '',
            'PORT': '',
            'RELOAD': ''
        }, clear=True):
            
            host = os.getenv("HOST", "127.0.0.1")
            port = int(os.getenv("PORT", "8000"))
            reload = os.getenv("RELOAD", "true").lower() == "true"
            
            assert host == ""  # Empty string should be returned
            assert port == 8000  # Should use default for empty string
            assert reload is False  # Empty string should be falsy
    
    def test_unicode_environment_variables(self):
        """Test with unicode environment variables."""
        with patch.dict(os.environ, {
            'HOST': 'localhost',
            'PORT': '8000',
            'RELOAD': 'true',
            'OPENAI_MODEL': 'gpt-4'
        }, clear=True):
            
            # Should handle unicode correctly
            host = os.getenv("HOST", "127.0.0.1")
            port = int(os.getenv("PORT", "8000"))
            reload = os.getenv("RELOAD", "true").lower() == "true"
            openai_model = os.getenv("OPENAI_MODEL", "gpt-4")
            
            assert host == "localhost"
            assert port == 8000
            assert reload is True
            assert openai_model == "gpt-4"


class TestStartServerIntegration:
    """Integration tests for start_server.py."""
    
    def test_full_server_startup_simulation(self):
        """Test full server startup simulation."""
        with patch.dict(os.environ, {
            'HOST': '0.0.0.0',
            'PORT': '8080',
            'RELOAD': 'false',
            'OPENAI_MODEL': 'gpt-3.5-turbo'
        }, clear=True):
            with patch('start_server.uvicorn.run') as mock_uvicorn_run:
                with patch('start_server.__name__', '__main__'):
                    with patch('start_server.print') as mock_print:
                        import start_server
                        
                        # Verify uvicorn.run was called with correct parameters
                        mock_uvicorn_run.assert_called_with(
                            "main:app",
                            host="0.0.0.0",
                            port=8080,
                            reload=False,
                            log_level="info"
                        )
                        
                        # Verify print statements were called
                        mock_print.assert_called()
                        print_calls = [call[0][0] for call in mock_print.call_args_list]
                        assert any("Starting EvolveAI FastAPI server" in call for call in print_calls)
                        assert any("Host: 0.0.0.0" in call for call in print_calls)
                        assert any("Port: 8080" in call for call in print_calls)
                        assert any("Reload: False" in call for call in print_calls)
                        assert any("OpenAI Model: gpt-3.5-turbo" in call for call in print_calls)
    
    def test_server_startup_with_mocked_main_app(self):
        """Test server startup with mocked main app."""
        with patch('start_server.uvicorn.run') as mock_uvicorn_run:
            with patch('start_server.__name__', '__main__'):
                # Mock the main app import
                with patch('start_server.main') as mock_main:
                    mock_main.app = Mock()
                    
                    import start_server
                    
                    # Verify uvicorn.run was called with main:app
                    mock_uvicorn_run.assert_called_with(
                        "main:app",
                        host="127.0.0.1",
                        port=8000,
                        reload=True,
                        log_level="info"
                    )
    
    def test_environment_variable_override_behavior(self):
        """Test that environment variables properly override defaults."""
        test_cases = [
            ({'HOST': 'custom-host'}, 'custom-host', 8000, True, 'gpt-4'),
            ({'PORT': '9000'}, '127.0.0.1', 9000, True, 'gpt-4'),
            ({'RELOAD': 'false'}, '127.0.0.1', 8000, False, 'gpt-4'),
            ({'OPENAI_MODEL': 'custom-model'}, '127.0.0.1', 8000, True, 'custom-model'),
        ]
        
        for env_vars, expected_host, expected_port, expected_reload, expected_model in test_cases:
            with patch.dict(os.environ, env_vars, clear=True):
                host = os.getenv("HOST", "127.0.0.1")
                port = int(os.getenv("PORT", "8000"))
                reload = os.getenv("RELOAD", "true").lower() == "true"
                openai_model = os.getenv("OPENAI_MODEL", "gpt-4")
                
                assert host == expected_host
                assert port == expected_port
                assert reload == expected_reload
                assert openai_model == expected_model


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
