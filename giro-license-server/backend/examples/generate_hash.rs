//! Password hash generator for seed data
//!
//! Run with: cargo run --example generate_hash
//! Or with custom password: cargo run --example generate_hash -- "YOUR_PASSWORD"

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();
    let password = if args.len() > 1 {
        args[1].clone()
    } else {
        "Admin@GIRO2026!".to_string()
    };

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .expect("Failed to hash password")
        .to_string();

    println!("{}", "=".repeat(60));
    println!("GIRO Password Hash Generator");
    println!("{}", "=".repeat(60));
    println!();
    println!("Password: {}", password);
    println!("Hash: {}", hash);
    println!();
    println!("{}", "-".repeat(60));
    println!("SQL for Admin Creation:");
    println!("{}", "-".repeat(60));
    println!();
    println!(
        "UPDATE admins SET password_hash = '{}' WHERE email = 'jhonslife@arkheion.com.br';",
        hash
    );
    println!();
    println!("Or for new admin:");
    println!();
    println!("INSERT INTO admins (email, password_hash, name, company_name, is_active, is_verified, verified_at)");
    println!("VALUES (");
    println!("    'jhonslife@arkheion.com.br',");
    println!("    '{}',", hash);
    println!("    'Jhonslife',");
    println!("    'Arkheion Corp',");
    println!("    TRUE,");
    println!("    TRUE,");
    println!("    NOW()");
    println!(");");
    println!();
    println!("{}", "=".repeat(60));
}
