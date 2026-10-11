package com.plantcare.repository;

import com.plantcare.model.SpeciesCareProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SpeciesCareProfileRepository extends JpaRepository<SpeciesCareProfile, Long> {

    Optional<SpeciesCareProfile> findByPid(String pid);

    Optional<SpeciesCareProfile> findByPidIgnoreCase(String pid);

    boolean existsByPid(String pid);

    boolean existsByPidIgnoreCase(String pid);

    Optional<SpeciesCareProfile> findFirstByAliasContainingIgnoreCase(String alias);

    Optional<SpeciesCareProfile> findFirstByDisplayPidContainingIgnoreCase(String displayPid);

    java.util.List<SpeciesCareProfile> findByPidContainingIgnoreCaseOrDisplayPidContainingIgnoreCaseOrAliasContainingIgnoreCase(String q1, String q2, String q3);
}
