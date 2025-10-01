#!/usr/bin/env python3
"""
Comprehensive script to fix async/await issues in test files
"""

import re
import os

def fix_async_tests_comprehensive():
    """Fix async/await issues comprehensively in test files"""
    
    test_files = [
        'tests/unit/services/test_database_service.py',
        'tests/unit/agents/test_fitness_coach.py',
        'tests/unit/services/test_fitness_api.py'
    ]
    
    for file_path in test_files:
        if not os.path.exists(file_path):
            print(f"File {file_path} not found, skipping...")
            continue
            
        print(f"Fixing {file_path}...")
        
        # Read the file
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Fix 1: Remove duplicate async keywords
        content = re.sub(r'async async def', 'async def', content)
        
        # Fix 2: Add @pytest.mark.asyncio decorator to async test methods
        # Pattern: async def test_...(
        content = re.sub(
            r'(\s+)async def (test_[^(]+)\(',
            r'\1@pytest.mark.asyncio\n\1async def \2(',
            content
        )
        
        # Fix 3: Add await to database service method calls
        database_methods = [
            'get_user_profile',
            'save_training_plan',
            'get_training_plan',
            'create_user_profile',
            'update_user_profile'
        ]
        
        for method in database_methods:
            # Pattern: result = database_service.method_name(
            content = re.sub(
                rf'(\s+)result = database_service\.{method}\(',
                rf'\1result = await database_service.{method}(',
                content
            )
            
            # Pattern: result = self.database_service.method_name(
            content = re.sub(
                rf'(\s+)result = self\.database_service\.{method}\(',
                rf'\1result = await self.database_service.{method}(',
                content
            )
        
        # Fix 4: Add await to training coach method calls
        coach_methods = [
            'generate_initial_questions',
            'generate_follow_up_questions',
            'generate_training_plan_outline',
            'generate_training_plan'
        ]
        
        for method in coach_methods:
            # Pattern: result = training_coach.method_name(
            content = re.sub(
                rf'(\s+)result = training_coach\.{method}\(',
                rf'\1result = await training_coach.{method}(',
                content
            )
            
            # Pattern: result = self.training_coach.method_name(
            content = re.sub(
                rf'(\s+)result = self\.training_coach\.{method}\(',
                rf'\1result = await self.training_coach.{method}(',
                content
            )
        
        # Write the fixed content back
        with open(file_path, 'w') as f:
            f.write(content)
        
        print(f"Fixed {file_path}")

if __name__ == "__main__":
    fix_async_tests_comprehensive()
