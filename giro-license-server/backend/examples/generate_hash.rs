//! Password hash generator for seed data
//!
//! Run with: cargo run --example generate_hash

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};

fn main() {
    let password = "password123";
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .expect("Failed to hash password")
        .to_string();

    println!("Password: {}", password);
    println!("Hash: {}", hash);
    println!();
    println!("SQL INSERT:");
    println!("INSERT INTO admins (email, password_hash, name, is_active, is_verified)");
    println!(
        "VALUES ('admin@giro.com.br', '{}', 'Admin Local', TRUE, TRUE);",
        hash
    );
}
