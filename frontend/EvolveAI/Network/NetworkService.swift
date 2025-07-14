//
//  NetworkService.swift
//  EvolveAI
//
//  Created by Dante van der Heijden on 12/07/2025.
//

import Foundation

class NetworkService {
    let baseURL = "http://127.0.0.1:8000/api"
    
    struct AuthResponse: Codable {
            let token: String
        }
    
    func login(credentials: [String: String], completion: @escaping (Result<String, Error>) -> Void) {
            guard let url = URL(string: "\(baseURL)/users/login/") else { return }
            
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            do {
                request.httpBody = try JSONSerialization.data(withJSONObject: credentials)
            } catch {
                completion(.failure(error))
                return
            }

            URLSession.shared.dataTask(with: request) { data, _, error in
                DispatchQueue.main.async {
                    if let data = data {
                        do {
                            let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)
                            // On success, pass back only the token string
                            completion(.success(authResponse.token))
                        } catch {
                            completion(.failure(error))
                        }
                    } else if let error = error {
                        completion(.failure(error))
                    }
                }
            }.resume()
        }
    
    func getAllCoaches(completion: @escaping (Result<[Coach], Error>) -> Void) {
            guard let url = URL(string: "\(baseURL)/coaches/") else {
                // Handle invalid URL error
                return
            }

            URLSession.shared.dataTask(with: url) { data, _, error in
                DispatchQueue.main.async {
                    if let data = data {
                        do {
                            let coaches = try JSONDecoder().decode([Coach].self, from: data)
                            completion(.success(coaches))
                        } catch {
                            completion(.failure(error))
                        }
                    } else if let error = error {
                        completion(.failure(error))
                    }
                }
            }.resume()
        }
    
    // Generates the initial workout plan
    func generateWorkout(for profile: UserProfile, authToken: String, completion: @escaping (Result<Void, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/workoutplan/") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")
        
        do {
            request.httpBody = try JSONEncoder().encode(profile)
        } catch {
            completion(.failure(error))
            return
        }

        URLSession.shared.dataTask(with: request) { _, response, error in
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 201 {
                completion(.success(()))
            } else if let error = error {
                completion(.failure(error))
            }
        }.resume()
    }

    // Retrieves an existing workout plan
    func getWorkoutPlan(authToken: String, completion: @escaping (Result<WorkoutPlan, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/workoutplan/") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { data, _, error in
            if let data = data {
                do {
                    let plan = try JSONDecoder().decode(WorkoutPlan.self, from: data)
                    completion(.success(plan))
                } catch {
                    completion(.failure(error))
                }
            } else if let error = error {
                completion(.failure(error))
            }
        }.resume()
    }
}
