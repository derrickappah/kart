-- Add face_image column to verification_requests table
alter table verification_requests 
add column if not exists face_image text;

-- Comment for documentation
comment on column verification_requests.face_image is 'Storage path or URL to the live selfie image of the applicant';
